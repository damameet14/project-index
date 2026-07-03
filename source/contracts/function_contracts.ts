/**
 * Function data contracts.
 *
 * Represents extracted function declarations including parameters,
 * return types, and metadata.
 */

import type { ExtractedParameterDefinition } from "./class_contracts.js";
import type { SymbolVisibility } from "./symbol_contracts.js";

export interface ExtractedFunction {
  /** Unique identifier matching the symbol identifier */
  readonly functionIdentifier: string;

  /** Function name as declared in source code */
  readonly functionName: string;

  /** Module this function belongs to */
  readonly moduleName: string;

  /** Relative file path */
  readonly filePath: string;

  /** 1-based line number */
  readonly lineNumber: number;

  /** Extracted parameters */
  readonly parameters: ExtractedParameterDefinition[];

  /** Return type annotation or inferred type */
  readonly returnType: string | null;

  /** Visibility / export status */
  readonly visibility: SymbolVisibility;

  /** Whether the function is async */
  readonly isAsync: boolean;

  /** Whether the function is a generator */
  readonly isGenerator: boolean;

  /** Whether the function is exported */
  readonly isExported: boolean;

  /** Extracted documentation */
  readonly documentation: string | null;

  /** Programming language */
  readonly language: string;

  /** The class this function belongs to, if it's a method */
  readonly containingClassName: string | null;
}
