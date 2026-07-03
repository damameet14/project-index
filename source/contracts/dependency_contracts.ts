/**
 * Dependency data contracts.
 *
 * Represents import/export relationships between files and modules.
 */

export type DependencyClassification =
  | "internal"      // Import resolves to a file within the scanned repository
  | "external"      // Import resolves to a third-party package
  | "standard_library" // Import resolves to a language built-in
  | "unknown";       // Import cannot be classified

export interface ExtractedFileDependency {
  /** Relative path of the file containing the import */
  readonly sourceFilePath: string;

  /** The raw import specifier as written in source code */
  readonly importSpecifier: string;

  /** Resolved relative path of the imported file, if internal */
  readonly resolvedTargetFilePath: string | null;

  /** Specific imported symbol names (named imports) */
  readonly importedSymbolNames: string[];

  /** Whether this is a namespace / wildcard import */
  readonly isNamespaceImport: boolean;

  /** Whether this is a default import */
  readonly isDefaultImport: boolean;

  /** Whether this is a re-export */
  readonly isReexport: boolean;

  /** Classification of the dependency */
  readonly classification: DependencyClassification;

  /** 1-based line number of the import statement */
  readonly lineNumber: number;
}

export interface ModuleDependencyEdge {
  /** Source module name */
  readonly sourceModuleName: string;

  /** Target module name */
  readonly targetModuleName: string;

  /** File-level dependencies that compose this module edge */
  readonly fileDependencyPaths: Array<{
    readonly sourceFilePath: string;
    readonly targetFilePath: string;
  }>;
}

export interface CircularDependencyChain {
  /** Ordered list of module names forming the cycle */
  readonly moduleNamesInCycle: string[];

  /** Human-readable description */
  readonly description: string;
}

export interface DependencyGraph {
  /** All file-level dependencies */
  readonly fileDependencies: ExtractedFileDependency[];

  /** Module-level dependency edges */
  readonly moduleDependencies: ModuleDependencyEdge[];

  /** Detected circular dependencies */
  readonly circularDependencies: CircularDependencyChain[];
}
