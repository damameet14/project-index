/**
 * Project context data contracts.
 *
 * Defines the shape of the primary AI entry point file (context.json).
 * This is the first file an AI assistant should read to understand a repository.
 */

export interface ProjectContextSummary {
  readonly totalFileCount: number;
  readonly totalSymbolCount: number;
  readonly totalClassCount: number;
  readonly totalFunctionCount: number;
  readonly detectedLanguages: string[];
  readonly detectedFrameworks: string[];
  readonly identifiedEntryPoints: string[];
}

export interface ProjectContextModuleSummary {
  readonly moduleName: string;
  readonly purpose: string;
  readonly locationPath: string;
  readonly publicSymbolNames: string[];
}

export interface ProjectContextConventions {
  readonly sourceRootPath: string | null;
  readonly testFilePattern: string | null;
  readonly configurationFiles: string[];
}

export interface ProjectContextDirectoryDescription {
  readonly directoryPath: string;
  readonly description: string;
}

export interface ProjectContext {
  /** Schema version for forward compatibility */
  readonly version: string;

  /** ISO 8601 timestamp when the context was generated */
  readonly generatedAtTimestamp: string;

  /** Project identification */
  readonly project: {
    readonly projectName: string;
    readonly description: string;
    readonly repositoryRootPath: string;
  };

  /** High-level numeric summary */
  readonly summary: ProjectContextSummary;

  /** Condensed module listing */
  readonly modules: ProjectContextModuleSummary[];

  /** Detected repository conventions */
  readonly conventions: ProjectContextConventions;

  /** Directory-to-purpose mapping */
  readonly directoryDescriptions: ProjectContextDirectoryDescription[];
}
