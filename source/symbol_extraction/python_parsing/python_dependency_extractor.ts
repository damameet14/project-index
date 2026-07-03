/**
 * Python dependency extractor.
 *
 * Extracts import and from-import statements from Python AST.
 * Classifies dependencies as internal, external, or standard library.
 */

import type { SyntaxNode } from "web-tree-sitter";
import type {
  ExtractedFileDependency,
  DependencyClassification,
} from "../../contracts/index.js";

/**
 * Known Python standard library module names (subset of most common).
 */
const PYTHON_STANDARD_LIBRARY_MODULES = new Set([
  "abc", "argparse", "ast", "asyncio", "base64", "bisect", "builtins",
  "calendar", "cgi", "cmd", "codecs", "collections", "colorsys",
  "concurrent", "configparser", "contextlib", "copy", "csv", "ctypes",
  "dataclasses", "datetime", "decimal", "difflib", "dis", "email",
  "enum", "errno", "faulthandler", "filecmp", "fileinput", "fnmatch",
  "fractions", "ftplib", "functools", "gc", "getpass", "gettext", "glob",
  "gzip", "hashlib", "heapq", "hmac", "html", "http", "imaplib",
  "importlib", "inspect", "io", "ipaddress", "itertools", "json",
  "keyword", "linecache", "locale", "logging", "lzma", "math",
  "mimetypes", "multiprocessing", "numbers", "operator", "os",
  "pathlib", "pickle", "platform", "pprint", "profile", "pstats",
  "queue", "random", "re", "readline", "reprlib", "secrets", "select",
  "shelve", "shlex", "shutil", "signal", "site", "smtplib", "socket",
  "sqlite3", "ssl", "stat", "statistics", "string", "struct",
  "subprocess", "sys", "sysconfig", "tempfile", "textwrap", "threading",
  "time", "timeit", "tkinter", "token", "tokenize", "tomllib", "trace",
  "traceback", "tracemalloc", "turtle", "types", "typing",
  "typing_extensions", "unicodedata", "unittest", "urllib", "uuid",
  "venv", "warnings", "wave", "weakref", "webbrowser", "xml",
  "xmlrpc", "zipfile", "zipimport", "zlib",
]);

/**
 * Extract all import dependencies from a Python parse tree.
 */
export function extractPythonDependencies(
  rootNode: SyntaxNode,
  relativeFilePath: string,
): ExtractedFileDependency[] {
  const dependencies: ExtractedFileDependency[] = [];

  for (const childNode of rootNode.children) {
    if (childNode.type === "import_statement") {
      dependencies.push(
        ...extractFromImportStatement(childNode, relativeFilePath),
      );
    } else if (childNode.type === "import_from_statement") {
      dependencies.push(
        ...extractFromImportFromStatement(childNode, relativeFilePath),
      );
    }
  }

  return dependencies;
}

function extractFromImportStatement(
  importNode: SyntaxNode,
  sourceFilePath: string,
): ExtractedFileDependency[] {
  const dependencies: ExtractedFileDependency[] = [];

  // `import foo, bar` — each dotted name is a separate import
  for (const childNode of importNode.children) {
    if (childNode.type === "dotted_name" || childNode.type === "aliased_import") {
      const moduleName = childNode.type === "aliased_import"
        ? childNode.childForFieldName("name")?.text ?? childNode.text
        : childNode.text;

      dependencies.push({
        sourceFilePath,
        importSpecifier: moduleName,
        resolvedTargetFilePath: null,
        importedSymbolNames: [moduleName],
        isNamespaceImport: true,
        isDefaultImport: false,
        isReexport: false,
        classification: classifyPythonDependency(moduleName),
        lineNumber: importNode.startPosition.row + 1,
      });
    }
  }

  return dependencies;
}

function extractFromImportFromStatement(
  importFromNode: SyntaxNode,
  sourceFilePath: string,
): ExtractedFileDependency[] {
  // Get the module name from `from <module> import ...`
  const moduleNameNode = importFromNode.childForFieldName("module_name");
  const moduleName = moduleNameNode?.text ?? "";

  // Determine if relative import
  const isRelativeImport = importFromNode.text.trimStart().startsWith("from .");

  // Get imported names
  const importedNames: string[] = [];
  let isWildcardImport = false;

  for (const childNode of importFromNode.children) {
    if (childNode.type === "import_list" || childNode.type === "import_prefix") {
      continue;
    }
    if (childNode.type === "dotted_name" && childNode !== moduleNameNode) {
      importedNames.push(childNode.text);
    }
    if (childNode.type === "aliased_import") {
      const nameNode = childNode.childForFieldName("name");
      if (nameNode) {
        importedNames.push(nameNode.text);
      }
    }
    if (childNode.type === "wildcard_import") {
      isWildcardImport = true;
    }
  }

  // Also check for imported names within the direct children
  for (const childNode of importFromNode.children) {
    if (childNode.type === "import_list") {
      for (const importedNode of childNode.children) {
        if (importedNode.type === "dotted_name") {
          importedNames.push(importedNode.text);
        } else if (importedNode.type === "aliased_import") {
          const nameNode = importedNode.childForFieldName("name");
          if (nameNode) {
            importedNames.push(nameNode.text);
          }
        }
      }
    }
  }

  const classification: DependencyClassification = isRelativeImport
    ? "internal"
    : classifyPythonDependency(moduleName);

  return [
    {
      sourceFilePath,
      importSpecifier: moduleName,
      resolvedTargetFilePath: isRelativeImport ? moduleName : null,
      importedSymbolNames: importedNames,
      isNamespaceImport: isWildcardImport,
      isDefaultImport: false,
      isReexport: false,
      classification,
      lineNumber: importFromNode.startPosition.row + 1,
    },
  ];
}

function classifyPythonDependency(
  moduleName: string,
): DependencyClassification {
  if (moduleName.startsWith(".")) {
    return "internal";
  }

  const topLevelModule = moduleName.split(".")[0];
  if (PYTHON_STANDARD_LIBRARY_MODULES.has(topLevelModule)) {
    return "standard_library";
  }

  return "external";
}
