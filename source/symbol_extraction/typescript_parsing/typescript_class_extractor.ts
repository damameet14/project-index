/**
 * TypeScript class extractor.
 *
 * Extracts detailed class information including methods, properties,
 * inheritance, decorators, and access modifiers.
 */

import type { SourceFile, ClassDeclaration, MethodDeclaration, PropertyDeclaration } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { ExtractedClass, ExtractedClassMethod, ExtractedClassProperty, ExtractedParameterDefinition } from "../../contracts/index.js";
import type { SymbolVisibility } from "../../contracts/index.js";

/**
 * Extract all class declarations from a TypeScript source file.
 */
export function extractTypeScriptClasses(
  sourceFile: SourceFile,
  moduleName: string,
  relativeFilePath: string,
): ExtractedClass[] {
  const extractedClasses: ExtractedClass[] = [];

  for (const classDeclaration of sourceFile.getClasses()) {
    const className = classDeclaration.getName();
    if (className === undefined) {
      continue;
    }

    extractedClasses.push(
      buildExtractedClass(classDeclaration, className, moduleName, relativeFilePath),
    );
  }

  return extractedClasses;
}

function buildExtractedClass(
  classDeclaration: ClassDeclaration,
  className: string,
  moduleName: string,
  relativeFilePath: string,
): ExtractedClass {
  const baseClass = classDeclaration.getBaseClass();
  const implementedInterfaces = classDeclaration.getImplements();

  return {
    classIdentifier: `${moduleName}::${className}`,
    className,
    moduleName,
    filePath: relativeFilePath,
    lineNumber: classDeclaration.getStartLineNumber(),
    baseClassName: baseClass?.getName() ?? null,
    implementedInterfaceNames: implementedInterfaces.map(
      (implementedInterface) => implementedInterface.getText(),
    ),
    methods: extractClassMethods(classDeclaration),
    properties: extractClassProperties(classDeclaration),
    visibility: classDeclaration.isExported() ? "public" : "internal",
    isAbstract: classDeclaration.isAbstract(),
    decoratorNames: classDeclaration
      .getDecorators()
      .map((decorator) => decorator.getName()),
    documentation: extractClassDocumentation(classDeclaration),
    language: "typescript",
  };
}

function extractClassMethods(
  classDeclaration: ClassDeclaration,
): ExtractedClassMethod[] {
  return classDeclaration.getMethods().map((methodDeclaration) =>
    buildExtractedMethod(methodDeclaration),
  );
}

function buildExtractedMethod(
  methodDeclaration: MethodDeclaration,
): ExtractedClassMethod {
  return {
    methodName: methodDeclaration.getName(),
    parameters: extractMethodParameters(methodDeclaration),
    returnType: safeGetReturnTypeText(methodDeclaration),
    visibility: determineMethodVisibility(methodDeclaration),
    isAsync: methodDeclaration.isAsync(),
    isStatic: methodDeclaration.isStatic(),
    isAbstract: methodDeclaration.isAbstract(),
    isGenerator: methodDeclaration.isGenerator(),
    documentation: extractMethodDocumentation(methodDeclaration),
    lineNumber: methodDeclaration.getStartLineNumber(),
  };
}

function extractMethodParameters(
  methodDeclaration: MethodDeclaration,
): ExtractedParameterDefinition[] {
  return methodDeclaration.getParameters().map((parameter) => ({
    parameterName: parameter.getName(),
    parameterType: safeGetTypeText(parameter),
    isOptional: parameter.isOptional(),
    hasDefaultValue: parameter.hasInitializer(),
    defaultValueText: parameter.getInitializer()?.getText() ?? null,
  }));
}

function extractClassProperties(
  classDeclaration: ClassDeclaration,
): ExtractedClassProperty[] {
  return classDeclaration.getProperties().map((propertyDeclaration) =>
    buildExtractedProperty(propertyDeclaration),
  );
}

function buildExtractedProperty(
  propertyDeclaration: PropertyDeclaration,
): ExtractedClassProperty {
  return {
    propertyName: propertyDeclaration.getName(),
    propertyType: safeGetTypeText(propertyDeclaration),
    visibility: determinePropertyVisibility(propertyDeclaration),
    isStatic: propertyDeclaration.isStatic(),
    isReadonly: propertyDeclaration.isReadonly(),
    hasDefaultValue: propertyDeclaration.hasInitializer(),
    documentation: null,
    lineNumber: propertyDeclaration.getStartLineNumber(),
  };
}

// ── Visibility helpers ──────────────────────────────────────────────

function determineMethodVisibility(
  methodDeclaration: MethodDeclaration,
): SymbolVisibility {
  if (methodDeclaration.hasModifier(SyntaxKind.PrivateKeyword)) {
    return "private";
  }
  if (methodDeclaration.hasModifier(SyntaxKind.ProtectedKeyword)) {
    return "protected";
  }
  return "public";
}

function determinePropertyVisibility(
  propertyDeclaration: PropertyDeclaration,
): SymbolVisibility {
  if (propertyDeclaration.hasModifier(SyntaxKind.PrivateKeyword)) {
    return "private";
  }
  if (propertyDeclaration.hasModifier(SyntaxKind.ProtectedKeyword)) {
    return "protected";
  }
  return "public";
}

// ── Documentation helpers ───────────────────────────────────────────

function extractClassDocumentation(
  classDeclaration: ClassDeclaration,
): string | null {
  const jsDocs = classDeclaration.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }
  const documentation = jsDocs
    .map((doc) => doc.getDescription())
    .join("\n")
    .trim();
  return documentation.length > 0 ? documentation : null;
}

function extractMethodDocumentation(
  methodDeclaration: MethodDeclaration,
): string | null {
  const jsDocs = methodDeclaration.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }
  const documentation = jsDocs
    .map((doc) => doc.getDescription())
    .join("\n")
    .trim();
  return documentation.length > 0 ? documentation : null;
}

// ── Type text helpers ───────────────────────────────────────────────

function safeGetReturnTypeText(
  methodDeclaration: MethodDeclaration,
): string | null {
  try {
    return methodDeclaration.getReturnType().getText(methodDeclaration);
  } catch {
    return null;
  }
}

function safeGetTypeText(
  node: { getType: () => { getText: (enclosingNode?: any) => string } },
): string | null {
  try {
    return node.getType().getText();
  } catch {
    return null;
  }
}
