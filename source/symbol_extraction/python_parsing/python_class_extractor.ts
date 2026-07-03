/**
 * Python class extractor.
 *
 * Extracts detailed class information from Python AST including
 * methods, properties (from __init__), base classes, and decorators.
 */

import type { SyntaxNode } from "web-tree-sitter";
import type {
  ExtractedClass,
  ExtractedClassMethod,
  ExtractedClassProperty,
  ExtractedParameterDefinition,
} from "../../contracts/index.js";
import {
  determinePythonVisibility,
  extractPythonDocstring,
} from "./python_symbol_extractor.js";

/**
 * Extract all class definitions from a Python parse tree root.
 */
export function extractPythonClasses(
  rootNode: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedClass[] {
  const extractedClasses: ExtractedClass[] = [];

  for (const childNode of rootNode.children) {
    if (childNode.type === "class_definition") {
      const classEntry = buildClassFromNode(childNode, moduleName, relativeFilePath);
      if (classEntry !== null) {
        extractedClasses.push(classEntry);
      }
    } else if (childNode.type === "decorated_definition") {
      const definitionNode = childNode.children.find(
        (child) => child.type === "class_definition",
      );
      if (definitionNode) {
        const classEntry = buildClassFromNode(definitionNode, moduleName, relativeFilePath);
        if (classEntry !== null) {
          // Add decorator names from the decorated_definition
          const decoratorNames = extractDecoratorNames(childNode);
          extractedClasses.push({ ...classEntry, decoratorNames });
        }
      }
    }
  }

  return extractedClasses;
}

function buildClassFromNode(
  classNode: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedClass | null {
  const nameNode = classNode.childForFieldName("name");
  if (nameNode === null) {
    return null;
  }

  const className = nameNode.text;
  const baseClassName = extractBaseClassName(classNode);
  const bodyNode = classNode.childForFieldName("body");

  const methods: ExtractedClassMethod[] = [];
  const properties: ExtractedClassProperty[] = [];

  if (bodyNode) {
    extractMethodsFromClassBody(bodyNode, methods);
    extractPropertiesFromInitMethod(bodyNode, properties);
    extractClassLevelProperties(bodyNode, properties);
  }

  return {
    classIdentifier: `${moduleName}::${className}`,
    className,
    moduleName,
    filePath: relativeFilePath,
    lineNumber: classNode.startPosition.row + 1,
    baseClassName,
    implementedInterfaceNames: [], // Python doesn't have explicit interface implementation
    methods,
    properties,
    visibility: determinePythonVisibility(className),
    isAbstract: false, // Would need to check for ABC metaclass
    decoratorNames: [],
    documentation: extractPythonDocstring(classNode),
    language: "python",
  };
}

function extractBaseClassName(classNode: SyntaxNode): string | null {
  const argumentListNode = classNode.childForFieldName("superclasses");
  if (argumentListNode === null) {
    return null;
  }

  // Get the first base class
  const firstArgument = argumentListNode.children.find(
    (child) => child.type === "identifier" || child.type === "attribute",
  );

  return firstArgument?.text ?? null;
}

function extractMethodsFromClassBody(
  bodyNode: SyntaxNode,
  methods: ExtractedClassMethod[],
): void {
  for (const childNode of bodyNode.children) {
    if (childNode.type === "function_definition") {
      const method = buildMethodFromNode(childNode);
      if (method !== null) {
        methods.push(method);
      }
    } else if (childNode.type === "decorated_definition") {
      const functionNode = childNode.children.find(
        (child) => child.type === "function_definition",
      );
      if (functionNode) {
        const method = buildMethodFromNode(functionNode);
        if (method !== null) {
          const decorators = extractDecoratorNames(childNode);
          const isStatic = decorators.includes("staticmethod");
          methods.push({ ...method, isStatic });
        }
      }
    }
  }
}

function buildMethodFromNode(
  functionNode: SyntaxNode,
): ExtractedClassMethod | null {
  const nameNode = functionNode.childForFieldName("name");
  if (nameNode === null) {
    return null;
  }

  const methodName = nameNode.text;
  const parametersNode = functionNode.childForFieldName("parameters");
  const parameters = extractParametersFromNode(parametersNode);

  // Remove 'self' and 'cls' from parameters
  const filteredParameters = parameters.filter(
    (parameter) =>
      parameter.parameterName !== "self" && parameter.parameterName !== "cls",
  );

  const returnTypeNode = functionNode.childForFieldName("return_type");
  const isAsync = functionNode.text.trimStart().startsWith("async ");

  return {
    methodName,
    parameters: filteredParameters,
    returnType: returnTypeNode?.text ?? null,
    visibility: determinePythonVisibility(methodName),
    isAsync,
    isStatic: false,
    isAbstract: false,
    isGenerator: containsYieldStatement(functionNode),
    documentation: extractPythonDocstring(functionNode),
    lineNumber: functionNode.startPosition.row + 1,
  };
}

function extractPropertiesFromInitMethod(
  bodyNode: SyntaxNode,
  properties: ExtractedClassProperty[],
): void {
  // Find __init__ method
  for (const childNode of bodyNode.children) {
    const functionNode =
      childNode.type === "function_definition"
        ? childNode
        : childNode.type === "decorated_definition"
          ? childNode.children.find((child) => child.type === "function_definition")
          : null;

    if (!functionNode) {
      continue;
    }

    const nameNode = functionNode.childForFieldName("name");
    if (nameNode?.text !== "__init__") {
      continue;
    }

    // Look for self.x = ... assignments in __init__ body
    const initBody = functionNode.childForFieldName("body");
    if (initBody === null) {
      continue;
    }

    extractSelfAssignments(initBody, properties);
  }
}

function extractSelfAssignments(
  bodyNode: SyntaxNode,
  properties: ExtractedClassProperty[],
): void {
  for (const statement of bodyNode.children) {
    if (statement.type !== "expression_statement") {
      continue;
    }

    const assignment = statement.children.find(
      (child) => child.type === "assignment",
    );
    if (assignment === null || assignment === undefined) {
      continue;
    }

    const leftNode = assignment.childForFieldName("left");
    if (leftNode?.type !== "attribute") {
      continue;
    }

    // Check it's self.something
    const objectNode = leftNode.childForFieldName("object");
    if (objectNode?.text !== "self") {
      continue;
    }

    const attributeNode = leftNode.childForFieldName("attribute");
    if (attributeNode === null) {
      continue;
    }

    const propertyName = attributeNode.text;

    // Avoid duplicates
    if (properties.some((property) => property.propertyName === propertyName)) {
      continue;
    }

    properties.push({
      propertyName,
      propertyType: null, // Type inference from assignment is complex
      visibility: determinePythonVisibility(propertyName),
      isStatic: false,
      isReadonly: false,
      hasDefaultValue: true,
      documentation: null,
      lineNumber: statement.startPosition.row + 1,
    });
  }
}

function extractClassLevelProperties(
  bodyNode: SyntaxNode,
  properties: ExtractedClassProperty[],
): void {
  for (const childNode of bodyNode.children) {
    if (childNode.type !== "expression_statement") {
      continue;
    }

    const assignment = childNode.children.find(
      (child) => child.type === "assignment",
    );
    if (assignment === null || assignment === undefined) {
      continue;
    }

    const leftNode = assignment.childForFieldName("left");
    if (leftNode?.type !== "identifier") {
      continue;
    }

    const propertyName = leftNode.text;

    if (properties.some((property) => property.propertyName === propertyName)) {
      continue;
    }

    properties.push({
      propertyName,
      propertyType: null,
      visibility: determinePythonVisibility(propertyName),
      isStatic: true, // Class-level assignments are class variables
      isReadonly: false,
      hasDefaultValue: true,
      documentation: null,
      lineNumber: childNode.startPosition.row + 1,
    });
  }
}

function extractParametersFromNode(
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
      parameters.push(buildParameterFromNode(childNode));
    }
  }

  return parameters;
}

function buildParameterFromNode(
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

function extractDecoratorNames(decoratedNode: SyntaxNode): string[] {
  return decoratedNode.children
    .filter((child) => child.type === "decorator")
    .map((decorator) => {
      // The decorator's expression is the child after '@'
      const expression = decorator.children.find(
        (child) => child.type !== "@",
      );
      if (expression === undefined) {
        return decorator.text.slice(1); // Remove '@'
      }
      // Get just the name, not the arguments
      if (expression.type === "call") {
        const functionNode = expression.childForFieldName("function");
        return functionNode?.text ?? expression.text;
      }
      return expression.text;
    });
}

function containsYieldStatement(functionNode: SyntaxNode): boolean {
  const bodyNode = functionNode.childForFieldName("body");
  if (bodyNode === null) {
    return false;
  }
  return searchForYield(bodyNode);
}

function searchForYield(node: SyntaxNode): boolean {
  if (node.type === "yield" || node.type === "yield_from") {
    return true;
  }
  // Don't recurse into nested functions
  if (node.type === "function_definition") {
    return false;
  }
  for (const child of node.children) {
    if (searchForYield(child)) {
      return true;
    }
  }
  return false;
}
