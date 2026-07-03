/**
 * Python symbol extractor.
 *
 * Extracts all symbol declarations from a Python source file
 * using tree-sitter AST. Handles classes, functions, variables,
 * constants, and imports.
 */

import type { default as Parser, SyntaxNode } from "web-tree-sitter";
import type {
  ExtractedSymbol,
  SymbolKind,
  SymbolVisibility,
} from "../../contracts/index.js";

/**
 * Extract all top-level symbols from a Python parse tree.
 */
export function extractPythonSymbols(
  rootNode: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  const extractedSymbols: ExtractedSymbol[] = [];

  for (const childNode of rootNode.children) {
    const nodeSymbols = extractSymbolFromNode(
      childNode,
      moduleName,
      relativeFilePath,
    );
    extractedSymbols.push(...nodeSymbols);
  }

  return extractedSymbols;
}

function extractSymbolFromNode(
  node: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  switch (node.type) {
    case "class_definition":
      return extractClassSymbolFromNode(node, moduleName, relativeFilePath);

    case "function_definition":
      return extractFunctionSymbolFromNode(node, moduleName, relativeFilePath);

    case "decorated_definition": {
      // The actual definition is the last child of a decorated_definition
      const definitionNode = node.children.find(
        (child) =>
          child.type === "class_definition" ||
          child.type === "function_definition",
      );
      if (definitionNode) {
        return extractSymbolFromNode(definitionNode, moduleName, relativeFilePath);
      }
      return [];
    }

    case "expression_statement": {
      // Module-level assignments (variables/constants)
      const assignmentNode = node.children.find(
        (child) => child.type === "assignment",
      );
      if (assignmentNode) {
        return extractVariableSymbolFromAssignment(
          assignmentNode,
          moduleName,
          relativeFilePath,
        );
      }
      return [];
    }

    default:
      return [];
  }
}

function extractClassSymbolFromNode(
  node: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  const nameNode = node.childForFieldName("name");
  if (nameNode === null) {
    return [];
  }

  const className = nameNode.text;
  const documentation = extractPythonDocstring(node);
  const visibility = determinePythonVisibility(className);

  return [
    {
      symbolIdentifier: `${moduleName}::${className}`,
      symbolName: className,
      symbolKind: "class",
      filePath: relativeFilePath,
      lineNumber: node.startPosition.row + 1,
      endLineNumber: node.endPosition.row + 1,
      language: "python",
      moduleName,
      visibility,
      documentation,
      signature: `class ${className}`,
      isExported: visibility === "public",
      relationships: [],
    },
  ];
}

function extractFunctionSymbolFromNode(
  node: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  const nameNode = node.childForFieldName("name");
  if (nameNode === null) {
    return [];
  }

  const functionName = nameNode.text;
  const documentation = extractPythonDocstring(node);
  const visibility = determinePythonVisibility(functionName);
  const parametersNode = node.childForFieldName("parameters");
  const parametersText = parametersNode?.text ?? "()";
  const returnTypeNode = node.childForFieldName("return_type");
  const returnTypeText = returnTypeNode ? ` -> ${returnTypeNode.text}` : "";

  const isAsync = node.parent?.type === "decorated_definition"
    ? node.text.startsWith("async ")
    : node.text.startsWith("async ");

  return [
    {
      symbolIdentifier: `${moduleName}::${functionName}`,
      symbolName: functionName,
      symbolKind: "function",
      filePath: relativeFilePath,
      lineNumber: node.startPosition.row + 1,
      endLineNumber: node.endPosition.row + 1,
      language: "python",
      moduleName,
      visibility,
      documentation,
      signature: `def ${functionName}${parametersText}${returnTypeText}`,
      isExported: visibility === "public",
      relationships: [],
    },
  ];
}

function extractVariableSymbolFromAssignment(
  node: SyntaxNode,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  const leftNode = node.childForFieldName("left");
  if (leftNode === null || leftNode.type !== "identifier") {
    return [];
  }

  const variableName = leftNode.text;
  const visibility = determinePythonVisibility(variableName);
  const isConstant = variableName === variableName.toUpperCase() && variableName.length > 1;
  const symbolKind: SymbolKind = isConstant ? "constant" : "variable";

  return [
    {
      symbolIdentifier: `${moduleName}::${variableName}`,
      symbolName: variableName,
      symbolKind,
      filePath: relativeFilePath,
      lineNumber: node.startPosition.row + 1,
      endLineNumber: node.endPosition.row + 1,
      language: "python",
      moduleName,
      visibility,
      documentation: null,
      signature: `${variableName}`,
      isExported: visibility === "public",
      relationships: [],
    },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Determine Python visibility based on naming conventions.
 * - __name__ (dunder) → public
 * - __name → private (name-mangled)
 * - _name → private
 * - name → public
 */
export function determinePythonVisibility(name: string): SymbolVisibility {
  if (name.startsWith("__") && name.endsWith("__")) {
    return "public"; // Dunder methods
  }
  if (name.startsWith("__")) {
    return "private"; // Name-mangled
  }
  if (name.startsWith("_")) {
    return "private"; // Convention-private
  }
  return "public";
}

/**
 * Extract a Python docstring from a class or function definition.
 * The docstring is the first statement if it's a string expression.
 */
export function extractPythonDocstring(
  definitionNode: SyntaxNode,
): string | null {
  const bodyNode = definitionNode.childForFieldName("body");
  if (bodyNode === null) {
    return null;
  }

  // The body is a "block" node; first child should be expression_statement
  const firstStatement = bodyNode.children.find(
    (child) => child.type === "expression_statement",
  );
  if (firstStatement === undefined) {
    return null;
  }

  const expressionNode = firstStatement.firstChild;
  if (expressionNode === null) {
    return null;
  }

  if (
    expressionNode.type === "string" ||
    expressionNode.type === "concatenated_string"
  ) {
    // Strip surrounding quotes
    let docstring = expressionNode.text;
    if (docstring.startsWith('"""') && docstring.endsWith('"""')) {
      docstring = docstring.slice(3, -3);
    } else if (docstring.startsWith("'''") && docstring.endsWith("'''")) {
      docstring = docstring.slice(3, -3);
    } else if (docstring.startsWith('"') && docstring.endsWith('"')) {
      docstring = docstring.slice(1, -1);
    } else if (docstring.startsWith("'") && docstring.endsWith("'")) {
      docstring = docstring.slice(1, -1);
    }
    return docstring.trim() || null;
  }

  return null;
}
