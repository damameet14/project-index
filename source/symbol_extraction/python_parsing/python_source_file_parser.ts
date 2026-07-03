/**
 * Python source file parser.
 *
 * Implements the LanguageParserInterface using web-tree-sitter
 * with the Python WASM grammar. Delegates to specialized extractors
 * for symbols, classes, functions, and dependencies.
 */

import Parser from "web-tree-sitter";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import type { LanguageParserInterface } from "../language_parser_interface.js";
import type { SingleFileParseResult } from "../../contracts/index.js";
import { extractPythonSymbols } from "./python_symbol_extractor.js";
import { extractPythonClasses } from "./python_class_extractor.js";
import { extractPythonFunctions } from "./python_function_extractor.js";
import { extractPythonDependencies } from "./python_dependency_extractor.js";
import { logDebug, logError } from "../../shared_utilities/index.js";

export class PythonSourceFileParser implements LanguageParserInterface {
  readonly languageName = "python";
  readonly supportedFileExtensions = [".py", ".pyi"];

  private parser: Parser | null = null;

  async initialize(): Promise<void> {
    await Parser.init();
    this.parser = new Parser();

    // Locate the Python WASM grammar file
    const wasmPath = await locatePythonWasmGrammar();
    const pythonLanguage = await Parser.Language.load(wasmPath);
    this.parser.setLanguage(pythonLanguage);

    logDebug("Python parser initialized with tree-sitter WASM grammar.");
  }

  async parseSourceFile(
    absoluteFilePath: string,
    fileContent: string,
    moduleName: string,
    relativeFilePath: string,
  ): Promise<SingleFileParseResult> {
    if (this.parser === null) {
      throw new Error(
        "Python parser has not been initialized. Call initialize() first.",
      );
    }

    logDebug(`Parsing Python file: ${relativeFilePath}`);

    const syntaxTree = this.parser.parse(fileContent);
    const rootNode = syntaxTree.rootNode;

    const extractedSymbols = extractPythonSymbols(
      rootNode,
      moduleName,
      relativeFilePath,
    );

    const extractedClasses = extractPythonClasses(
      rootNode,
      moduleName,
      relativeFilePath,
    );

    const extractedFunctions = extractPythonFunctions(
      rootNode,
      moduleName,
      relativeFilePath,
    );

    const extractedDependencies = extractPythonDependencies(
      rootNode,
      relativeFilePath,
    );

    return {
      filePath: relativeFilePath,
      extractedSymbols,
      extractedClasses,
      extractedFunctions,
      extractedDependencies,
    };
  }

  dispose(): void {
    this.parser = null;
    logDebug("Python parser disposed.");
  }
}

/**
 * Locate the tree-sitter-python WASM grammar file.
 * Searches in several standard locations.
 */
async function locatePythonWasmGrammar(): Promise<string> {
  const searchPaths: string[] = [];

  // Try relative to this file's location
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirectory = dirname(currentFilePath);

    // wasm/ directory at project root
    searchPaths.push(join(currentDirectory, "..", "..", "..", "wasm", "tree-sitter-python.wasm"));
    searchPaths.push(join(currentDirectory, "..", "..", "wasm", "tree-sitter-python.wasm"));

    // node_modules locations
    searchPaths.push(join(currentDirectory, "..", "..", "..", "node_modules", "tree-sitter-python", "tree-sitter-python.wasm"));
    searchPaths.push(join(currentDirectory, "..", "..", "..", "node_modules", "tree-sitter-wasms", "out", "tree-sitter-python.wasm"));
  } catch {
    // import.meta.url might not work in all contexts
  }

  // Current working directory locations
  searchPaths.push(join(process.cwd(), "wasm", "tree-sitter-python.wasm"));
  searchPaths.push(join(process.cwd(), "node_modules", "tree-sitter-python", "tree-sitter-python.wasm"));

  for (const candidatePath of searchPaths) {
    if (existsSync(candidatePath)) {
      logDebug(`Found Python WASM grammar at: ${candidatePath}`);
      return candidatePath;
    }
  }

  const errorMessage = [
    "Could not locate tree-sitter-python.wasm grammar file.",
    "Searched in:",
    ...searchPaths.map((p) => `  - ${p}`),
    "",
    "Please ensure the WASM file is available. You can:",
    "  1. Place it in the wasm/ directory of the project",
    "  2. Install tree-sitter-python: npm install tree-sitter-python",
  ].join("\n");

  logError(errorMessage);
  throw new Error(errorMessage);
}
