/**
 * Repository scanning module barrel export.
 */

export { createIgnorePatternResolver, type IgnorePatternResolver } from "./ignore_pattern_resolver.js";
export { detectLanguageFromFilePath, getFileExtensionsForLanguage, isFilePathSupportedLanguage, type SupportedLanguage } from "./programming_language_detector.js";
export { detectProjectModules } from "./project_module_detector.js";
export { executeRepositoryScan, type RepositoryScanRequest } from "./repository_scanner_orchestrator.js";
export { startFileChangeWatcher, type FileChangeWatcherRequest } from "./file_change_watcher.js";
