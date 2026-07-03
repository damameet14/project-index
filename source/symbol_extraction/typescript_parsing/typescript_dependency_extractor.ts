/**
 * TypeScript dependency extractor.
 *
 * Extracts import and re-export declarations from TypeScript source files.
 * Classifies dependencies as internal, external, or standard library.
 */

import type { SourceFile, ImportDeclaration, ExportDeclaration } from "ts-morph";
import type { ExtractedFileDependency, DependencyClassification } from "../../contracts/index.js";

/**
 * Extract all import and re-export dependencies from a TypeScript source file.
 */
export function extractTypeScriptDependencies(
  sourceFile: SourceFile,
  relativeFilePath: string,
): ExtractedFileDependency[] {
  const dependencies: ExtractedFileDependency[] = [];

  // Import declarations
  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    dependencies.push(
      buildDependencyFromImport(importDeclaration, relativeFilePath),
    );
  }

  // Re-export declarations (export { x } from './y')
  for (const exportDeclaration of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exportDeclaration.getModuleSpecifierValue();
    if (moduleSpecifier !== undefined) {
      dependencies.push(
        buildDependencyFromReexport(exportDeclaration, relativeFilePath),
      );
    }
  }

  return dependencies;
}

function buildDependencyFromImport(
  importDeclaration: ImportDeclaration,
  sourceFilePath: string,
): ExtractedFileDependency {
  const importSpecifier = importDeclaration.getModuleSpecifierValue();
  const namedImports = importDeclaration.getNamedImports();
  const defaultImport = importDeclaration.getDefaultImport();
  const namespaceImport = importDeclaration.getNamespaceImport();

  const importedSymbolNames = namedImports.map((namedImport) =>
    namedImport.getName(),
  );

  if (defaultImport) {
    importedSymbolNames.unshift(defaultImport.getText());
  }

  return {
    sourceFilePath,
    importSpecifier,
    resolvedTargetFilePath: resolveImportToRelativePath(importSpecifier),
    importedSymbolNames,
    isNamespaceImport: namespaceImport !== undefined,
    isDefaultImport: defaultImport !== undefined,
    isReexport: false,
    classification: classifyDependency(importSpecifier),
    lineNumber: importDeclaration.getStartLineNumber(),
  };
}

function buildDependencyFromReexport(
  exportDeclaration: ExportDeclaration,
  sourceFilePath: string,
): ExtractedFileDependency {
  const moduleSpecifier = exportDeclaration.getModuleSpecifierValue() ?? "";
  const namedExports = exportDeclaration.getNamedExports();

  return {
    sourceFilePath,
    importSpecifier: moduleSpecifier,
    resolvedTargetFilePath: resolveImportToRelativePath(moduleSpecifier),
    importedSymbolNames: namedExports.map((namedExport) =>
      namedExport.getName(),
    ),
    isNamespaceImport: exportDeclaration.isNamespaceExport(),
    isDefaultImport: false,
    isReexport: true,
    classification: classifyDependency(moduleSpecifier),
    lineNumber: exportDeclaration.getStartLineNumber(),
  };
}

/**
 * Classify a dependency by its import specifier.
 */
function classifyDependency(
  importSpecifier: string,
): DependencyClassification {
  // Relative imports (./foo, ../bar)
  if (importSpecifier.startsWith(".")) {
    return "internal";
  }

  // Node.js built-ins (node:fs, fs, path, etc.)
  if (importSpecifier.startsWith("node:")) {
    return "standard_library";
  }

  const nodeBuiltins = new Set([
    "assert", "buffer", "child_process", "cluster", "console", "constants",
    "crypto", "dgram", "dns", "domain", "events", "fs", "http", "http2",
    "https", "module", "net", "os", "path", "perf_hooks", "process",
    "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
    "sys", "timers", "tls", "tty", "url", "util", "v8", "vm", "wasi",
    "worker_threads", "zlib",
  ]);

  if (nodeBuiltins.has(importSpecifier) || nodeBuiltins.has(importSpecifier.split("/")[0])) {
    return "standard_library";
  }

  // Everything else is external (npm packages)
  return "external";
}

/**
 * For relative imports, return the specifier as-is (without extension resolution).
 * For non-relative imports, return null.
 */
function resolveImportToRelativePath(
  importSpecifier: string,
): string | null {
  if (importSpecifier.startsWith(".")) {
    return importSpecifier;
  }
  return null;
}
