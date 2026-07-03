/**
 * Watch command.
 *
 * Starts continuous monitoring of the repository and
 * triggers incremental index updates on file changes.
 */

import { Command } from "commander";
import { resolve } from "node:path";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import { startFileChangeWatcher } from "../../repository_scanning/index.js";
import { setLogLevel } from "../../shared_utilities/index.js";

export function watchCommand(): Command {
  return new Command("watch")
    .description("Watch for file changes and update indexes automatically.")
    .option("--root <path>", "Repository root path", ".")
    .option("--verbose", "Enable verbose output")
    .action(async (options) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      const repositoryRootPath = resolve(options.root);
      const configuration = await loadProjectIndexConfiguration(
        repositoryRootPath,
      );

      const watcher = await startFileChangeWatcher({
        repositoryRootPath,
        configuration,
      });

      // Graceful shutdown
      const shutdownHandler = () => {
        console.log("\nStopping watcher...");
        watcher.close().then(() => {
          process.exit(0);
        });
      };

      process.on("SIGINT", shutdownHandler);
      process.on("SIGTERM", shutdownHandler);
    });
}
