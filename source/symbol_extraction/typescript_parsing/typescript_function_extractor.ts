/**
 * TypeScript function extractor.
 *
 * Extracts detailed function declarations including parameters,
 * return types, async/generator status, and documentation.
 */

import type { SourceFile, FunctionDeclaration } from "ts-morph";
import type { ExtractedFunction } from "../../contracts/index.js";
import type { ExtractedParameterDefinition } from "../../contracts/index.js";

/**
 * Extract all top-level function declarations from a TypeScript source file.
 */
export function extractTypeScriptFunctions(
  sourceFile: SourceFile,
  moduleName: string,
  relativeFilePath: string,
): ExtractedFunction[] {
  const extractedFunctions: ExtractedFunction[] = [];

  for (const functionDeclaration of sourceFile.getFunctions()) {
    const functionName = functionDeclaration.getName();
    if (functionName === undefined) {
      continue;
    }

    extractedFunctions.push(
      buildExtractedFunction(
        functionDeclaration,
        functionName,
        moduleName,
        relativeFilePath,
      ),
    );
  }

  return extractedFunctions;
}

function buildExtractedFunction(
  functionDeclaration: FunctionDeclaration,
  functionName: string,
  moduleName: string,
  relativeFilePath: string,
): ExtractedFunction {
  return {
    functionIdentifier: `${moduleName}::${functionName}`,
    functionName,
    moduleName,
    filePath: relativeFilePath,
    lineNumber: functionDeclaration.getStartLineNumber(),
    parameters: extractFunctionParameters(functionDeclaration),
    returnType: safeGetFunctionReturnType(functionDeclaration),
    visibility: functionDeclaration.isExported() ? "public" : "internal",
    isAsync: functionDeclaration.isAsync(),
    isGenerator: functionDeclaration.isGenerator(),
    isExported: functionDeclaration.isExported(),
    documentation: extractFunctionDocumentation(functionDeclaration),
    language: "typescript",
    containingClassName: null,
  };
}

function extractFunctionParameters(
  functionDeclaration: FunctionDeclaration,
): ExtractedParameterDefinition[] {
  return functionDeclaration.getParameters().map((parameter) => ({
    parameterName: parameter.getName(),
    parameterType: safeGetParameterType(parameter),
    isOptional: parameter.isOptional(),
    hasDefaultValue: parameter.hasInitializer(),
    defaultValueText: parameter.getInitializer()?.getText() ?? null,
  }));
}

function safeGetFunctionReturnType(
  functionDeclaration: FunctionDeclaration,
): string | null {
  try {
    return functionDeclaration.getReturnType().getText(functionDeclaration);
  } catch {
    return null;
  }
}

function safeGetParameterType(
  parameter: { getType: () => { getText: () => string } },
): string | null {
  try {
    return parameter.getType().getText();
  } catch {
    return null;
  }
}

function extractFunctionDocumentation(
  functionDeclaration: FunctionDeclaration,
): string | null {
  const jsDocs = functionDeclaration.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }
  const documentation = jsDocs
    .map((doc) => doc.getDescription())
    .join("\n")
    .trim();
  return documentation.length > 0 ? documentation : null;
}
