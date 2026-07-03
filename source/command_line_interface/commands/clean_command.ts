/**
 * Clean command.
 *
 * Removes the .project-index output directory.
 */

import { Command } from "commander";
import { rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import { logInformation, logSuccess, logWarning, setLogLevel } from "../../shared_utilities/index.js";

export function cleanCommand(): Command {
  return new Command("clean")
    .description("Remove the generated index directory.")
    .option("--root <path>", "Repository root path", ".")
    .option("--verbose", "Enable verbose output")
    .action(async (options) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      const repositoryRootPath = resolve(options.root);
      const configuration = await loadProjectIndexConfiguration(repositoryRootPath);
      const outputDirectoryPath = join(
        repositoryRootPath,
        configuration.outputDirectoryName,
      );

      if (!existsSync(outputDirectoryPath)) {
        logWarning("No index directory found. Nothing to clean.");
        return;
      }

      await rm(outputDirectoryPath, { recursive: true, force: true });
      logSuccess(`Removed: ${outputDirectoryPath}`);
    });
}
