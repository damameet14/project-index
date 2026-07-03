/**
 * Validate command.
 *
 * Verifies that existing indexes match the current source code
 * by comparing file content hashes.
 */

import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { calculateContentHash } from "../../shared_utilities/index.js";
import { logInformation, logError, logSuccess, logWarning, setLogLevel } from "../../shared_utilities/index.js";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";

export function validateCommand(): Command {
  return new Command("validate")
    .description("Verify that indexes match current source code.")
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

      const metadataFilePath = join(outputDirectoryPath, "metadata.json");

      if (!existsSync(metadataFilePath)) {
        logError("No metadata.json found. Run 'project-index scan' first.");
        process.exit(1);
      }

      const metadataContent = await readFile(metadataFilePath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const storedHashes: Record<string, string> = metadata.fileContentHashes ?? {};

      let validFileCount = 0;
      let staleFileCount = 0;
      let missingFileCount = 0;

      for (const [filePath, storedHash] of Object.entries(storedHashes)) {
        const absoluteFilePath = join(repositoryRootPath, filePath);

        if (!existsSync(absoluteFilePath)) {
          logWarning(`Missing file: ${filePath}`);
          missingFileCount++;
          continue;
        }

        const currentContent = await readFile(absoluteFilePath, "utf-8");
        const currentHash = calculateContentHash(currentContent);

        if (currentHash === storedHash) {
          validFileCount++;
        } else {
          logWarning(`Stale index for: ${filePath}`);
          staleFileCount++;
        }
      }

      logInformation(`Validated ${validFileCount + staleFileCount + missingFileCount} files:`);
      logSuccess(`  ${validFileCount} up-to-date`);

      if (staleFileCount > 0) {
        logWarning(`  ${staleFileCount} stale (re-run 'project-index scan')`);
      }
      if (missingFileCount > 0) {
        logWarning(`  ${missingFileCount} missing`);
      }

      if (staleFileCount === 0 && missingFileCount === 0) {
        logSuccess("All indexes are up-to-date.");
      } else {
        process.exit(1);
      }
    });
}
