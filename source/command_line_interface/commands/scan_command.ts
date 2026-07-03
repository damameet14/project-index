/**
 * Scan command.
 *
 * Performs a full repository scan and generates all index files.
 */

import { Command } from "commander";
import { resolve } from "node:path";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import { executeRepositoryScan } from "../../repository_scanning/index.js";
import { setLogLevel } from "../../shared_utilities/index.js";

export function scanCommand(): Command {
  return new Command("scan")
    .description("Scan the repository and generate index files.")
    .option("--root <path>", "Repository root path", ".")
    .option("--config <path>", "Configuration file path")
    .option("--verbose", "Enable verbose output")
    .option("--quiet", "Suppress output")
    .action(async (options) => {
      if (options.verbose) {
        setLogLevel("debug");
      } else if (options.quiet) {
        setLogLevel("error");
      }

      const repositoryRootPath = resolve(options.root);
      const configuration = await loadProjectIndexConfiguration(
        repositoryRootPath,
      );

      if (options.verbose) {
        configuration.isVerboseLoggingEnabled;
      }

      await executeRepositoryScan({
        repositoryRootPath,
        configuration,
      });
    });
}
