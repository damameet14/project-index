/**
 * Scan statistics data contracts.
 *
 * Represents aggregate metrics about the scanned repository.
 */

export interface ScanStatistics {
  /** Total number of scanned files */
  readonly totalFileCount: number;

  /** Count of files per language */
  readonly fileCountByLanguage: Record<string, number>;

  /** Total lines of code across all scanned files */
  readonly totalLineCount: number;

  /** Lines of code per language */
  readonly lineCountByLanguage: Record<string, number>;

  /** Number of detected modules */
  readonly moduleCount: number;

  /** Number of extracted classes */
  readonly classCount: number;

  /** Number of extracted functions (including methods) */
  readonly functionCount: number;

  /** Number of extracted symbols (all kinds) */
  readonly symbolCount: number;

  /** Number of detected routes (v1: always 0) */
  readonly routeCount: number;

  /** Average files per module */
  readonly averageFilesPerModule: number;

  /** Average functions per file */
  readonly averageFunctionsPerFile: number;

  /** Duration of the scan in milliseconds */
  readonly scanDurationMilliseconds: number;

  /** ISO 8601 timestamp when statistics were generated */
  readonly generatedAtTimestamp: string;
}
