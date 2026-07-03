/**
 * File change watcher.
 *
 * Uses chokidar to continuously monitor the repository for file changes
 * and trigger incremental re-parsing of modified files.
 */

import { watch, type FSWatcher } from "chokidar";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectIndexConfiguration } from "../configuration/index.js";
import { createIgnorePatternResolver } from "./ignore_pattern_resolver.js";
import { isFilePathSupportedLanguage, detectLanguageFromFilePath } from "./programming_language_detector.js";
import { detectProjectModules } from "./project_module_detector.js";
import {
  LanguageParserRegistry,
  TypeScriptSourceFileParser,
  PythonSourceFileParser,
} from "../symbol_extraction/index.js";
import { executeRepositoryScan, type RepositoryScanRequest } from "./repository_scanner_orchestrator.js";
import { convertToRelativePath } from "../shared_utilities/index.js";
import {
  logInformation,
  logDebug,
  logError,
  logSuccess,
} from "../shared_utilities/index.js";

export interface FileChangeWatcherRequest {
  repositoryRootPath: string;
  configuration: ProjectIndexConfiguration;
}

/**
 * Start watching the repository for file changes.
 *
 * Performs an initial full scan, then watches for changes and
 * triggers incremental updates.
 */
export async function startFileChangeWatcher(
  request: FileChangeWatcherRequest,
): Promise<FSWatcher> {
  const { repositoryRootPath, configuration } = request;

  // Perform initial full scan
  logInformation("Performing initial repository scan...");
  await executeRepositoryScan({
    repositoryRootPath,
    configuration,
  });

  // Set up ignore resolver
  const ignoreResolver = await createIgnorePatternResolver(
    repositoryRootPath,
    configuration.additionalIgnorePatterns,
  );

  // Start watching
  const watcherInstance = watch(repositoryRootPath, {
    ignored: (filePath: string) => {
      const relativePath = convertToRelativePath(filePath, repositoryRootPath);
      return ignoreResolver.shouldIgnorePath(relativePath);
    },
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  // Debounce mechanism
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingChangedFiles = new Set<string>();

  function scheduleIncrementalUpdate(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const filesToProcess = [...pendingChangedFiles];
      pendingChangedFiles.clear();

      if (filesToProcess.length > 0) {
        logInformation(
          `Processing ${filesToProcess.length} changed file(s)...`,
        );
        // For now, re-run full scan on changes
        // Future: implement true incremental parsing
        try {
          await executeRepositoryScan({
            repositoryRootPath,
            configuration,
          });
          logSuccess("Index updated.");
        } catch (error) {
          logError(
            `Index update failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }, 500);
  }

  watcherInstance.on("change", (filePath: string) => {
    if (isFilePathSupportedLanguage(filePath)) {
      const relativePath = convertToRelativePath(filePath, repositoryRootPath);
      logDebug(`File changed: ${relativePath}`);
      pendingChangedFiles.add(filePath);
      scheduleIncrementalUpdate();
    }
  });

  watcherInstance.on("add", (filePath: string) => {
    if (isFilePathSupportedLanguage(filePath)) {
      const relativePath = convertToRelativePath(filePath, repositoryRootPath);
      logDebug(`File added: ${relativePath}`);
      pendingChangedFiles.add(filePath);
      scheduleIncrementalUpdate();
    }
  });

  watcherInstance.on("unlink", (filePath: string) => {
    if (isFilePathSupportedLanguage(filePath)) {
      const relativePath = convertToRelativePath(filePath, repositoryRootPath);
      logDebug(`File removed: ${relativePath}`);
      pendingChangedFiles.add(filePath);
      scheduleIncrementalUpdate();
    }
  });

  watcherInstance.on("error", (error: unknown) => {
    logError(`Watcher error: ${error instanceof Error ? error.message : String(error)}`);
  });

  logSuccess(
    `Watching for changes in ${repositoryRootPath}... (Ctrl+C to stop)`,
  );

  return watcherInstance;
}
