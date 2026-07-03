/**
 * Symbol data contracts.
 *
 * Defines the shape of every extracted code symbol.
 * Used as the shared contract between parsers and output generators.
 */

// ── Symbol classification ───────────────────────────────────────────

export type SymbolKind =
  | "module"
  | "class"
  | "function"
  | "method"
  | "interface"
  | "enum"
  | "variable"
  | "constant"
  | "route"
  | "component"
  | "hook"
  | "namespace"
  | "type_alias"
  | "decorator";

export type SymbolVisibility =
  | "public"
  | "private"
  | "protected"
  | "internal";

// ── Relationship between symbols ────────────────────────────────────

export type SymbolRelationshipKind =
  | "imports"
  | "exports"
  | "extends"
  | "implements"
  | "calls"
  | "used_by"
  | "contains"
  | "depends_on";

export interface SymbolRelationship {
  readonly relationshipKind: SymbolRelationshipKind;
  readonly targetSymbolIdentifier: string;
}

// ── Core symbol entry ───────────────────────────────────────────────

export interface ExtractedSymbol {
  /** Unique identifier, e.g. "user_authentication::UserAuthenticator" */
  readonly symbolIdentifier: string;

  /** Human-readable name as it appears in source code */
  readonly symbolName: string;

  /** Classification of the symbol */
  readonly symbolKind: SymbolKind;

  /** Relative file path (forward slashes) */
  readonly filePath: string;

  /** 1-based line number where the symbol is declared */
  readonly lineNumber: number;

  /** End line number of the symbol declaration */
  readonly endLineNumber: number;

  /** Programming language */
  readonly language: string;

  /** Module this symbol belongs to */
  readonly moduleName: string;

  /** Visibility / access level */
  readonly visibility: SymbolVisibility;

  /** Extracted documentation (JSDoc, docstring) or null */
  readonly documentation: string | null;

  /** Source-level signature, e.g. "function authenticate(user: string): Promise<boolean>" */
  readonly signature: string | null;

  /** Whether this symbol is exported from its file */
  readonly isExported: boolean;

  /** Relationships to other symbols */
  readonly relationships: SymbolRelationship[];
}
