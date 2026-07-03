/**
 * Shared utilities barrel export.
 */

export {
  setLogLevel,
  getLogLevel,
  logError,
  logWarning,
  logInformation,
  logDebug,
  logSuccess,
  type LogLevel,
} from "./structured_logger.js";

export {
  calculateContentHash,
  calculateObjectHash,
} from "./content_hash_calculator.js";

export {
  normalizeToForwardSlashes,
  convertToRelativePath,
  resolveAbsolutePath,
  extractDirectoryPath,
  extractFileName,
} from "./path_normalizer.js";

export {
  startPerformanceTimer,
  type PerformanceMeasurement,
} from "./performance_timer.js";
