/**
 * Class data contracts.
 *
 * Represents extracted class declarations including inheritance,
 * methods, properties, and decorators.
 */

// ── Class member contracts ──────────────────────────────────────────

import type { SymbolVisibility } from "./symbol_contracts.js";

export interface ExtractedClassMethod {
  readonly methodName: string;
  readonly parameters: ExtractedParameterDefinition[];
  readonly returnType: string | null;
  readonly visibility: SymbolVisibility;
  readonly isAsync: boolean;
  readonly isStatic: boolean;
  readonly isAbstract: boolean;
  readonly isGenerator: boolean;
  readonly documentation: string | null;
  readonly lineNumber: number;
}

export interface ExtractedClassProperty {
  readonly propertyName: string;
  readonly propertyType: string | null;
  readonly visibility: SymbolVisibility;
  readonly isStatic: boolean;
  readonly isReadonly: boolean;
  readonly hasDefaultValue: boolean;
  readonly documentation: string | null;
  readonly lineNumber: number;
}

export interface ExtractedParameterDefinition {
  readonly parameterName: string;
  readonly parameterType: string | null;
  readonly isOptional: boolean;
  readonly hasDefaultValue: boolean;
  readonly defaultValueText: string | null;
}

// ── Class entry ─────────────────────────────────────────────────────

export interface ExtractedClass {
  /** Unique identifier matching the symbol identifier */
  readonly classIdentifier: string;

  /** Class name as declared in source code */
  readonly className: string;

  /** Module this class belongs to */
  readonly moduleName: string;

  /** Relative file path */
  readonly filePath: string;

  /** 1-based line number */
  readonly lineNumber: number;

  /** Name of the base class, if any */
  readonly baseClassName: string | null;

  /** Names of implemented interfaces */
  readonly implementedInterfaceNames: string[];

  /** Extracted methods */
  readonly methods: ExtractedClassMethod[];

  /** Extracted properties */
  readonly properties: ExtractedClassProperty[];

  /** Visibility of the class itself */
  readonly visibility: SymbolVisibility;

  /** Whether the class is abstract */
  readonly isAbstract: boolean;

  /** Applied decorator names */
  readonly decoratorNames: string[];

  /** Extracted documentation */
  readonly documentation: string | null;

  /** Programming language */
  readonly language: string;
}
