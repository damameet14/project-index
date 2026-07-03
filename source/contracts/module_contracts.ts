/**
 * Module data contracts.
 *
 * Represents a logical grouping of related source files
 * within the scanned repository (e.g., a package, feature directory,
 * or monorepo sub-project).
 */

export type ModuleStatus = "active" | "deprecated" | "unknown";

export interface DetectedModule {
  /** Module name derived from directory or package manifest */
  readonly moduleName: string;

  /** Brief description inferred from README, docstrings, or package description */
  readonly purpose: string;

  /** Relative path to the module root directory */
  readonly locationPath: string;

  /** Identifiers of symbols exported through the public interface */
  readonly publicInterfaceSymbolIdentifiers: string[];

  /** Names of modules this module depends on */
  readonly dependencyModuleNames: string[];

  /** Names of modules that depend on this module */
  readonly dependentModuleNames: string[];

  /** Detected technologies and frameworks (e.g., "express", "react", "flask") */
  readonly detectedTechnologies: string[];

  /** Current module status */
  readonly status: ModuleStatus;

  /** Relative paths of all files belonging to this module */
  readonly containedFilePaths: string[];

  /** Programming languages present in this module */
  readonly containedLanguages: string[];

  /** Entry point file, if identifiable */
  readonly entryPointFilePath: string | null;

  /** Name of the parent module, if this is a sub-module */
  readonly parentModuleName?: string | null;

  /** Names of sub-modules contained within this module */
  readonly subModuleNames?: string[];
}
