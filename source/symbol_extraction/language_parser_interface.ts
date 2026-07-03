/**
 * Language parser interface.
 *
 * Defines the contract that every language-specific parser must implement.
 * This allows the scanner to process any supported language through
 * a uniform interface.
 */

import type { SingleFileParseResult } from "../contracts/index.js";

export interface LanguageParserInterface {
  /** The language this parser handles */
  readonly languageName: string;

  /** File extensions this parser can process */
  readonly supportedFileExtensions: string[];

  /** Initialize the parser (load grammars, create projects, etc.) */
  initialize(): Promise<void>;

  /**
   * Parse a single source file and extract symbols, classes, functions,
   * and dependencies.
   */
  parseSourceFile(
    absoluteFilePath: string,
    fileContent: string,
    moduleName: string,
    relativeFilePath: string,
  ): Promise<SingleFileParseResult>;

  /** Release resources held by the parser */
  dispose(): void;
}
