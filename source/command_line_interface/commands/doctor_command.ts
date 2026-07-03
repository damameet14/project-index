/**
 * Doctor command.
 *
 * Diagnoses potential issues with the Project Index setup,
 * including missing parsers, invalid config, and stale indexes.
 */

import { Command } from "commander";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import { setLogLevel } from "../../shared_utilities/index.js";

export function doctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnose Project Index setup issues.")
    .option("--root <path>", "Repository root path", ".")
    .option("--verbose", "Enable verbose output")
    .action(async (options) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      const repositoryRootPath = resolve(options.root);
      const issues: string[] = [];
      const successes: string[] = [];

      // Check configuration
      try {
        const configuration = await loadProjectIndexConfiguration(repositoryRootPath);
        successes.push("Configuration loaded successfully");

        // Check output directory
        const outputDirectoryPath = join(
          repositoryRootPath,
          configuration.outputDirectoryName,
        );

        if (existsSync(outputDirectoryPath)) {
          successes.push(`Output directory exists: ${configuration.outputDirectoryName}`);

          // Check for expected files
          const expectedFiles = [
            "context.json",
            "modules.json",
            "symbols.json",
            "classes.json",
            "functions.json",
            "dependencies.json",
            "statistics.json",
            "metadata.json",
          ];

          for (const expectedFile of expectedFiles) {
            const filePath = join(outputDirectoryPath, expectedFile);
            if (existsSync(filePath)) {
              successes.push(`Found: ${expectedFile}`);
            } else {
              issues.push(`Missing: ${expectedFile} — run 'project-index scan'`);
            }
          }
        } else {
          issues.push("Output directory does not exist — run 'project-index init'");
        }

        // Check for tree-sitter WASM
        if (configuration.enabledLanguages.includes("python")) {
          const wasmCandidates = [
            join(repositoryRootPath, "wasm", "tree-sitter-python.wasm"),
            join(repositoryRootPath, "node_modules", "tree-sitter-python", "tree-sitter-python.wasm"),
          ];

          const hasWasm = wasmCandidates.some((path) => existsSync(path));
          if (hasWasm) {
            successes.push("Python WASM grammar found");
          } else {
            issues.push(
              "Python WASM grammar not found — install tree-sitter-python or place .wasm in wasm/",
            );
          }
        }
      } catch (error) {
        issues.push(
          `Configuration error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Print results
      console.log("");
      console.log(chalk.bold("  🩺 Project Index Doctor"));
      console.log(chalk.gray("  ─────────────────────────────"));

      for (const success of successes) {
        console.log(`  ${chalk.green("✓")} ${success}`);
      }

      for (const issue of issues) {
        console.log(`  ${chalk.red("✗")} ${issue}`);
      }

      console.log("");

      if (issues.length === 0) {
        console.log(chalk.green("  Everything looks good!"));
      } else {
        console.log(
          chalk.yellow(`  ${issues.length} issue(s) found. See above for details.`),
        );
      }

      console.log("");
    });
}
