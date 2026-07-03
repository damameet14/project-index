/**
 * TypeScript symbol extractor.
 *
 * Extracts all symbol declarations from a TypeScript source file
 * using ts-morph. Handles classes, functions, interfaces, enums,
 * variables, type aliases, and namespaces.
 */

import {
  type SourceFile,
  type ClassDeclaration,
  type FunctionDeclaration,
  type InterfaceDeclaration,
  type EnumDeclaration,
  type VariableDeclaration,
  type TypeAliasDeclaration,
  type ModuleDeclaration,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";
import type {
  ExtractedSymbol,
  SymbolKind,
  SymbolVisibility,
} from "../../contracts/index.js";

/**
 * Extract all symbols from a TypeScript source file.
 */
export function extractTypeScriptSymbols(
  sourceFile: SourceFile,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol[] {
  const extractedSymbols: ExtractedSymbol[] = [];

  // Classes
  for (const classDeclaration of sourceFile.getClasses()) {
    const symbol = extractClassSymbol(classDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  // Functions
  for (const functionDeclaration of sourceFile.getFunctions()) {
    const symbol = extractFunctionSymbol(functionDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  // Interfaces
  for (const interfaceDeclaration of sourceFile.getInterfaces()) {
    const symbol = extractInterfaceSymbol(interfaceDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  // Enums
  for (const enumDeclaration of sourceFile.getEnums()) {
    const symbol = extractEnumSymbol(enumDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  // Type aliases
  for (const typeAliasDeclaration of sourceFile.getTypeAliases()) {
    const symbol = extractTypeAliasSymbol(typeAliasDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  // Top-level variables and constants
  for (const variableStatement of sourceFile.getVariableStatements()) {
    for (const variableDeclaration of variableStatement.getDeclarations()) {
      const isExported = variableStatement.isExported();
      const isConstant = variableStatement.getDeclarationKind() === VariableDeclarationKind.Const;
      const symbol = extractVariableSymbol(
        variableDeclaration,
        moduleName,
        relativeFilePath,
        isExported,
        isConstant,
      );
      if (symbol !== null) {
        extractedSymbols.push(symbol);
      }
    }
  }

  // Namespaces / Modules
  for (const moduleDeclaration of sourceFile.getModules()) {
    const symbol = extractNamespaceSymbol(moduleDeclaration, moduleName, relativeFilePath);
    if (symbol !== null) {
      extractedSymbols.push(symbol);
    }
  }

  return extractedSymbols;
}

// ── Individual extractors ───────────────────────────────────────────

function extractClassSymbol(
  classDeclaration: ClassDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const className = classDeclaration.getName();
  if (className === undefined) {
    return null; // Anonymous class expression
  }

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, className),
    symbolName: className,
    symbolKind: "class",
    filePath: relativeFilePath,
    lineNumber: classDeclaration.getStartLineNumber(),
    endLineNumber: classDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(classDeclaration.isExported()),
    documentation: extractJSDocumentation(classDeclaration),
    signature: `class ${className}`,
    isExported: classDeclaration.isExported(),
    relationships: [],
  };
}

function extractFunctionSymbol(
  functionDeclaration: FunctionDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const functionName = functionDeclaration.getName();
  if (functionName === undefined) {
    return null;
  }

  const parameters = functionDeclaration
    .getParameters()
    .map((parameter) => {
      const parameterType = parameter.getType().getText(parameter);
      return `${parameter.getName()}: ${parameterType}`;
    })
    .join(", ");

  const returnType = functionDeclaration.getReturnType().getText(functionDeclaration);
  const asyncPrefix = functionDeclaration.isAsync() ? "async " : "";
  const generatorStar = functionDeclaration.isGenerator() ? "*" : "";

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, functionName),
    symbolName: functionName,
    symbolKind: "function",
    filePath: relativeFilePath,
    lineNumber: functionDeclaration.getStartLineNumber(),
    endLineNumber: functionDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(functionDeclaration.isExported()),
    documentation: extractJSDocumentation(functionDeclaration),
    signature: `${asyncPrefix}function${generatorStar} ${functionName}(${parameters}): ${returnType}`,
    isExported: functionDeclaration.isExported(),
    relationships: [],
  };
}

function extractInterfaceSymbol(
  interfaceDeclaration: InterfaceDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const interfaceName = interfaceDeclaration.getName();

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, interfaceName),
    symbolName: interfaceName,
    symbolKind: "interface",
    filePath: relativeFilePath,
    lineNumber: interfaceDeclaration.getStartLineNumber(),
    endLineNumber: interfaceDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(interfaceDeclaration.isExported()),
    documentation: extractJSDocumentation(interfaceDeclaration),
    signature: `interface ${interfaceName}`,
    isExported: interfaceDeclaration.isExported(),
    relationships: [],
  };
}

function extractEnumSymbol(
  enumDeclaration: EnumDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const enumName = enumDeclaration.getName();

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, enumName),
    symbolName: enumName,
    symbolKind: "enum",
    filePath: relativeFilePath,
    lineNumber: enumDeclaration.getStartLineNumber(),
    endLineNumber: enumDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(enumDeclaration.isExported()),
    documentation: extractJSDocumentation(enumDeclaration),
    signature: `enum ${enumName}`,
    isExported: enumDeclaration.isExported(),
    relationships: [],
  };
}

function extractTypeAliasSymbol(
  typeAliasDeclaration: TypeAliasDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const typeAliasName = typeAliasDeclaration.getName();

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, typeAliasName),
    symbolName: typeAliasName,
    symbolKind: "type_alias",
    filePath: relativeFilePath,
    lineNumber: typeAliasDeclaration.getStartLineNumber(),
    endLineNumber: typeAliasDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(typeAliasDeclaration.isExported()),
    documentation: extractJSDocumentation(typeAliasDeclaration),
    signature: `type ${typeAliasName}`,
    isExported: typeAliasDeclaration.isExported(),
    relationships: [],
  };
}

function extractVariableSymbol(
  variableDeclaration: VariableDeclaration,
  moduleName: string,
  relativeFilePath: string,
  isExported: boolean,
  isConstant: boolean,
): ExtractedSymbol | null {
  const variableName = variableDeclaration.getName();

  // Skip destructured bindings
  if (variableName.includes("{") || variableName.includes("[")) {
    return null;
  }

  const symbolKind: SymbolKind = isConstant ? "constant" : "variable";

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, variableName),
    symbolName: variableName,
    symbolKind,
    filePath: relativeFilePath,
    lineNumber: variableDeclaration.getStartLineNumber(),
    endLineNumber: variableDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(isExported),
    documentation: null,
    signature: `${isConstant ? "const" : "let"} ${variableName}`,
    isExported,
    relationships: [],
  };
}

function extractNamespaceSymbol(
  moduleDeclaration: ModuleDeclaration,
  moduleName: string,
  relativeFilePath: string,
): ExtractedSymbol | null {
  const namespaceName = moduleDeclaration.getName();

  return {
    symbolIdentifier: buildSymbolIdentifier(moduleName, namespaceName),
    symbolName: namespaceName,
    symbolKind: "namespace",
    filePath: relativeFilePath,
    lineNumber: moduleDeclaration.getStartLineNumber(),
    endLineNumber: moduleDeclaration.getEndLineNumber(),
    language: "typescript",
    moduleName,
    visibility: determineTypeScriptVisibility(moduleDeclaration.isExported()),
    documentation: extractJSDocumentation(moduleDeclaration),
    signature: `namespace ${namespaceName}`,
    isExported: moduleDeclaration.isExported(),
    relationships: [],
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function buildSymbolIdentifier(moduleName: string, symbolName: string): string {
  return `${moduleName}::${symbolName}`;
}

function determineTypeScriptVisibility(isExported: boolean): SymbolVisibility {
  return isExported ? "public" : "internal";
}

function extractJSDocumentation(
  node: { getJsDocs?: () => Array<{ getDescription: () => string }> },
): string | null {
  if (typeof node.getJsDocs !== "function") {
    return null;
  }
  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }
  const combinedDocumentation = jsDocs
    .map((doc) => doc.getDescription())
    .join("\n")
    .trim();
  return combinedDocumentation.length > 0 ? combinedDocumentation : null;
}
