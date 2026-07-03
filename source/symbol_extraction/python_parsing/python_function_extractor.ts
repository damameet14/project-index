/**
 * Python function extractor.
 *
 * Extracts top-level function definitions from Python AST
 * including parameters, return types, and async/generator status.
 */

import type { SyntaxNode } from "web-tree-sitter";
import type { ExtractedFunction } from "../../contracts/index.js";
import type { ExtractedParameterDefinition } from "../../contracts/index.js";
import {
  determinePythonVisibility,
  extractPythonDocstring,
} from "./python_symbol_extractor.js";

/**
 * Extract all top-level function definitions from a Python parse tree.
 */
export function extractPythonFunctions(
  rootNode: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedFunction[] {
  const extractedFunctions: ExtractedFunction[] = [];

  for (const childNode of rootNode.children) {
    if (childNode.type === "function_definition") {
      const functionEntry = buildFunctionFromNode(
        childNode,
        moduleName,
        relativeFilePath,
      );
      if (functionEntry !== null) {
        extractedFunctions.push(functionEntry);
      }
    } else if (childNode.type === "decorated_definition") {
      const functionNode = childNode.children.find(
        (child) => child.type === "function_definition",
      );
      if (functionNode) {
        const functionEntry = buildFunctionFromNode(
          functionNode,
          moduleName,
          relativeFilePath,
        );
        if (functionEntry !== null) {
          extractedFunctions.push(functionEntry);
        }
      }
    }
  }

  return extractedFunctions;
}

function buildFunctionFromNode(
  functionNode: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedFunction | null {
  const nameNode = functionNode.childForFieldName("name");
  if (nameNode === null) {
    return null;
  }

  const functionName = nameNode.text;
  const parametersNode = functionNode.childForFieldName("parameters");
  const parameters = extractFunctionParameters(parametersNode);
  const returnTypeNode = functionNode.childForFieldName("return_type");
  const isAsync = functionNode.text.trimStart().startsWith("async ");
  const isGenerator = containsYieldInBody(functionNode);
  const visibility = determinePythonVisibility(functionName);

  return {
    functionIdentifier: `${moduleName}::${functionName}`,
    functionName,
    moduleName,
    filePath: relativeFilePath,
    lineNumber: functionNode.startPosition.row + 1,
    parameters,
    returnType: returnTypeNode?.text ?? null,
    visibility,
    isAsync,
    isGenerator,
    isExported: visibility === "public",
    documentation: extractPythonDocstring(functionNode),
    language: "python",
    containingClassName: null,
  };
}

function extractFunctionParameters(
  parametersNode: SyntaxNode | null,
): ExtractedParameterDefinition[] {
  if (parametersNode === null) {
    return [];
  }

  const parameters: ExtractedParameterDefinition[] = [];

  for (const childNode of parametersNode.children) {
    if (
      childNode.type === "identifier" ||
      childNode.type === "typed_parameter" ||
      childNode.type === "default_parameter" ||
      childNode.type === "typed_default_parameter"
    ) {
      const parameter = buildParameterDefinition(childNode);
      // Skip 'self' parameter
      if (parameter.parameterName !== "self") {
        parameters.push(parameter);
      }
    }
  }

  return parameters;
}

function buildParameterDefinition(
  parameterNode: SyntaxNode,
): ExtractedParameterDefinition {
  switch (parameterNode.type) {
    case "identifier":
      return {
        parameterName: parameterNode.text,
        parameterType: null,
        isOptional: false,
        hasDefaultValue: false,
        defaultValueText: null,
      };

    case "typed_parameter": {
      const nameNode = parameterNode.firstChild;
      const typeNode = parameterNode.childForFieldName("type");
      return {
        parameterName: nameNode?.text ?? parameterNode.text,
        parameterType: typeNode?.text ?? null,
        isOptional: false,
        hasDefaultValue: false,
        defaultValueText: null,
      };
    }

    case "default_parameter": {
      const nameNode = parameterNode.childForFieldName("name");
      const valueNode = parameterNode.childForFieldName("value");
      return {
        parameterName: nameNode?.text ?? parameterNode.text,
        parameterType: null,
        isOptional: true,
        hasDefaultValue: true,
        defaultValueText: valueNode?.text ?? null,
      };
    }

    case "typed_default_parameter": {
      const nameNode = parameterNode.childForFieldName("name");
      const typeNode = parameterNode.childForFieldName("type");
      const valueNode = parameterNode.childForFieldName("value");
      return {
        parameterName: nameNode?.text ?? parameterNode.text,
        parameterType: typeNode?.text ?? null,
        isOptional: true,
        hasDefaultValue: true,
        defaultValueText: valueNode?.text ?? null,
      };
    }

    default:
      return {
        parameterName: parameterNode.text,
        parameterType: null,
        isOptional: false,
        hasDefaultValue: false,
        defaultValueText: null,
      };
  }
}

function containsYieldInBody(functionNode: SyntaxNode): boolean {
  const bodyNode = functionNode.childForFieldName("body");
  if (bodyNode === null) {
    return false;
  }
  return searchForYieldNode(bodyNode);
}

function searchForYieldNode(node: SyntaxNode): boolean {
  if (node.type === "yield" || node.type === "yield_from") {
    return true;
  }
  if (node.type === "function_definition") {
    return false; // Don't recurse into nested functions
  }
  for (const child of node.children) {
    if (searchForYieldNode(child)) {
      return true;
    }
  }
  return false;
}
