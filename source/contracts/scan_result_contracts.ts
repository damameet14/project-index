/**
 * Scan result data contracts.
 *
 * Represents the output of a complete repository scan or
 * an incremental single-file parse.
 */

import type { ExtractedClass } from "./class_contracts.js";
import type { DependencyGraph, ExtractedFileDependency } from "./dependency_contracts.js";
import type { ExtractedFunction } from "./function_contracts.js";
import type { DetectedModule } from "./module_contracts.js";
import type { ProjectContext } from "./project_context_contracts.js";
import type { ScanStatistics } from "./scan_statistics_contracts.js";
import type { ExtractedSymbol } from "./symbol_contracts.js";

// ── Single file parse result ────────────────────────────────────────

export interface SingleFileParseResult {
  /** Relative file path that was parsed */
  readonly filePath: string;

  /** All symbols extracted from this file */
  readonly extractedSymbols: ExtractedSymbol[];

  /** All classes extracted from this file */
  readonly extractedClasses: ExtractedClass[];

  /** All functions extracted from this file */
  readonly extractedFunctions: ExtractedFunction[];

  /** All import/dependency statements from this file */
  readonly extractedDependencies: ExtractedFileDependency[];
}

// ── Complete repository scan result ─────────────────────────────────

export interface RepositoryScanResult {
  /** All detected modules */
  readonly detectedModules: DetectedModule[];

  /** All extracted symbols across all files */
  readonly allExtractedSymbols: ExtractedSymbol[];

  /** All extracted classes across all files */
  readonly allExtractedClasses: ExtractedClass[];

  /** All extracted functions across all files */
  readonly allExtractedFunctions: ExtractedFunction[];

  /** Complete dependency graph */
  readonly dependencyGraph: DependencyGraph;

  /** Generated project context */
  readonly projectContext: ProjectContext;

  /** Scan statistics */
  readonly scanStatistics: ScanStatistics;

  /** Per-file content hashes for incremental updates */
  readonly fileContentHashes: Record<string, string>;
}

// ── Scan metadata ───────────────────────────────────────────────────

export interface ScanMetadata {
  /** Version of the Project Index schema */
  readonly schemaVersion: string;

  /** Version of the Project Index tool */
  readonly toolVersion: string;

  /** ISO 8601 timestamp of the scan */
  readonly generatedAtTimestamp: string;

  /** Scan duration in milliseconds */
  readonly scanDurationMilliseconds: number;

  /** Hash of the configuration used */
  readonly configurationHash: string;

  /** Per-file content hashes */
  readonly fileContentHashes: Record<string, string>;

  /** Repository root path */
  readonly repositoryRootPath: string;
}
