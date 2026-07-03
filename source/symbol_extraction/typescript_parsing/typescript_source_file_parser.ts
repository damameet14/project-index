/**
 * TypeScript source file parser.
 *
 * Implements the LanguageParserInterface using ts-morph.
 * Delegates to specialized extractors for symbols, classes,
 * functions, and dependencies.
 */

import { Project, type SourceFile } from "ts-morph";
import type { LanguageParserInterface } from "../language_parser_interface.js";
import type { SingleFileParseResult } from "../../contracts/index.js";
import { extractTypeScriptSymbols } from "./typescript_symbol_extractor.js";
import { extractTypeScriptClasses } from "./typescript_class_extractor.js";
import { extractTypeScriptFunctions } from "./typescript_function_extractor.js";
import { extractTypeScriptDependencies } from "./typescript_dependency_extractor.js";
import { logDebug } from "../../shared_utilities/index.js";

export class TypeScriptSourceFileParser implements LanguageParserInterface {
  readonly languageName: string;
  readonly supportedFileExtensions: string[];

  private tsMorphProject: Project | null = null;

  constructor(
    languageName = "typescript",
    supportedFileExtensions = [".ts", ".tsx", ".mts", ".cts"]
  ) {
    this.languageName = languageName;
    this.supportedFileExtensions = supportedFileExtensions;
  }

  async initialize(): Promise<void> {
    this.tsMorphProject = new Project({
      compilerOptions: {
        allowJs: true,
        noEmit: true,
        strict: false,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
    });
    logDebug("TypeScript parser initialized with ts-morph Project.");
  }

  async parseSourceFile(
    absoluteFilePath: string,
    fileContent: string,
    moduleName: string,
    relativeFilePath: string,
  ): Promise<SingleFileParseResult> {
    if (this.tsMorphProject === null) {
      throw new Error(
        "TypeScript parser has not been initialized. Call initialize() first.",
      );
    }

    // Add or update the source file in the ts-morph project
    let sourceFile: SourceFile;
    const existingSourceFile = this.tsMorphProject.getSourceFile(absoluteFilePath);

    if (existingSourceFile) {
      existingSourceFile.replaceWithText(fileContent);
      sourceFile = existingSourceFile;
    } else {
      sourceFile = this.tsMorphProject.createSourceFile(
        absoluteFilePath,
        fileContent,
        { overwrite: true },
      );
    }

    logDebug(`Parsing TypeScript file: ${relativeFilePath}`);

    const extractedSymbols = extractTypeScriptSymbols(
      sourceFile,
      moduleName,
      relativeFilePath,
    );

    const extractedClasses = extractTypeScriptClasses(
      sourceFile,
      moduleName,
      relativeFilePath,
    );

    const extractedFunctions = extractTypeScriptFunctions(
      sourceFile,
      moduleName,
      relativeFilePath,
    );

    const extractedDependencies = extractTypeScriptDependencies(
      sourceFile,
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
    this.tsMorphProject = null;
    logDebug("TypeScript parser disposed.");
  }
}
