/**
 * Configuration schema and type definitions.
 *
 * Defines the shape of user-provided configuration for Project Index.
 */

export interface ProjectIndexConfiguration {
  /** Directory where generated index files are written (default: ".project-index") */
  readonly outputDirectoryName: string;

  /** Languages to scan for (default: ["typescript", "javascript", "python"]) */
  readonly enabledLanguages: string[];

  /** Additional file/directory patterns to ignore during scanning */
  readonly additionalIgnorePatterns: string[];

  /** If set, only scan files under these paths (relative to repository root) */
  readonly restrictToIncludePaths: string[];

  /** Whether to detect and scan monorepo sub-projects (default: true) */
  readonly isMonorepoDetectionEnabled: boolean;

  /** Manual entry point file paths (overrides automatic detection) */
  readonly manualEntryPointPaths: string[];

  /** Whether to produce verbose log output (default: false) */
  readonly isVerboseLoggingEnabled: boolean;
}

/**
 * Default configuration values applied when the user provides no config file.
 */
export const DEFAULT_PROJECT_INDEX_CONFIGURATION: ProjectIndexConfiguration = {
  outputDirectoryName: ".project-index",
  enabledLanguages: ["typescript", "javascript", "python"],
  additionalIgnorePatterns: [],
  restrictToIncludePaths: [],
  isMonorepoDetectionEnabled: true,
  manualEntryPointPaths: [],
  isVerboseLoggingEnabled: false,
};
