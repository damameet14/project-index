/**
 * Initialize command.
 *
 * Creates the .project-index directory and an optional default
 * configuration file in the current repository.
 */

import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { DEFAULT_PROJECT_INDEX_CONFIGURATION } from "../../configuration/index.js";
import { logInformation, logSuccess, logWarning, setLogLevel } from "../../shared_utilities/index.js";

export function initializeCommand(): Command {
  return new Command("init")
    .description("Initialize Project Index in the current repository.")
    .option("--root <path>", "Repository root path", ".")
    .option("--verbose", "Enable verbose output")
    .action(async (options) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      const repositoryRootPath = resolve(options.root);
      const outputDirectoryPath = join(
        repositoryRootPath,
        DEFAULT_PROJECT_INDEX_CONFIGURATION.outputDirectoryName,
      );

      if (existsSync(outputDirectoryPath)) {
        logWarning(
          `Output directory already exists: ${outputDirectoryPath}`,
        );
      } else {
        await mkdir(outputDirectoryPath, { recursive: true });
        logSuccess(`Created output directory: ${outputDirectoryPath}`);
      }

      // Create default config file
      const configFilePath = join(
        repositoryRootPath,
        ".project-indexrc.json",
      );
      if (!existsSync(configFilePath)) {
        const defaultConfig = {
          outputDirectoryName: DEFAULT_PROJECT_INDEX_CONFIGURATION.outputDirectoryName,
          enabledLanguages: DEFAULT_PROJECT_INDEX_CONFIGURATION.enabledLanguages,
          isMonorepoDetectionEnabled: DEFAULT_PROJECT_INDEX_CONFIGURATION.isMonorepoDetectionEnabled,
        };
        await writeFile(
          configFilePath,
          JSON.stringify(defaultConfig, null, 2),
          "utf-8",
        );
        logSuccess(`Created default configuration: ${configFilePath}`);
      }

      logInformation("Project Index initialized. Run 'project-index scan' to generate indexes.");
    });
}
