/**
 * Statistics command.
 *
 * Prints repository statistics from the generated index to the console.
 */

import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import { logError, setLogLevel } from "../../shared_utilities/index.js";

export function statisticsCommand(): Command {
  return new Command("statistics")
    .description("Print repository statistics from the generated index.")
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

      const statisticsFilePath = join(outputDirectoryPath, "statistics.json");

      if (!existsSync(statisticsFilePath)) {
        logError("No statistics.json found. Run 'project-index scan' first.");
        process.exit(1);
      }

      const statisticsContent = await readFile(statisticsFilePath, "utf-8");
      const statistics = JSON.parse(statisticsContent);

      console.log("");
      console.log(chalk.bold("  📊 Repository Statistics"));
      console.log(chalk.gray("  ─────────────────────────────"));
      console.log(`  Files:       ${chalk.cyan(statistics.totalFileCount)}`);
      console.log(`  Symbols:     ${chalk.cyan(statistics.symbolCount)}`);
      console.log(`  Modules:     ${chalk.cyan(statistics.moduleCount)}`);
      console.log(`  Classes:     ${chalk.cyan(statistics.classCount)}`);
      console.log(`  Functions:   ${chalk.cyan(statistics.functionCount)}`);
      console.log(`  Routes:      ${chalk.cyan(statistics.routeCount)}`);
      console.log("");

      if (statistics.fileCountByLanguage) {
        console.log(chalk.bold("  Languages:"));
        for (const [language, count] of Object.entries(statistics.fileCountByLanguage)) {
          console.log(`    ${language}: ${chalk.cyan(String(count))} files`);
        }
        console.log("");
      }

      console.log(`  Scan duration: ${chalk.yellow(statistics.scanDurationMilliseconds)}ms`);
      console.log(`  Generated at:  ${chalk.gray(statistics.generatedAtTimestamp)}`);
      console.log("");
    });
}
