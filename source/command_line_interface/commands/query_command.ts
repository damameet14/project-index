/**
 * Query command.
 *
 * Queries the symbols SQLite database for matching symbol details.
 */

import { Command } from "commander";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { loadProjectIndexConfiguration } from "../../configuration/index.js";
import {
  querySymbolsByName,
  querySymbolsByModule,
  querySymbolsByKind,
} from "../../persistent_storage/index.js";
import type { ExtractedSymbol } from "../../contracts/index.js";

export function queryCommand(): Command {
  return new Command("query")
    .description("Query semantic symbols in the repository.")
    .argument("[name]", "Symbol name to query")
    .option("--root <path>", "Repository root path", ".")
    .option("--fuzzy", "Use fuzzy search (LIKE '%name%')")
    .option("--module <moduleName>", "Filter by module name")
    .option("--kind <kind>", "Filter by symbol kind (e.g., function, class)")
    .option("--json", "Output results in JSON format")
    .action(async (name, options) => {
      const repositoryRootPath = resolve(options.root);
      const configuration = await loadProjectIndexConfiguration(
        repositoryRootPath,
      );

      const databasePath = join(
        repositoryRootPath,
        configuration.outputDirectoryName,
        "symbols.sqlite",
      );

      if (!existsSync(databasePath)) {
        console.error(
          `Error: SQLite database not found at ${databasePath}.\n` +
          "Please run 'project-index scan' first to generate the indexes.",
        );
        process.exit(1);
      }

      let symbols: ExtractedSymbol[] = [];

      try {
        if (options.module) {
          symbols = await querySymbolsByModule(databasePath, options.module);
        } else if (options.kind) {
          symbols = await querySymbolsByKind(databasePath, options.kind);
        } else if (name) {
          symbols = await querySymbolsByName(databasePath, name, !!options.fuzzy);
        } else {
          console.error(
            "Error: You must specify a symbol name, --module, or --kind to query.",
          );
          process.exit(1);
        }

        // Apply filters locally if multiple options are mixed (e.g. query name AND module)
        if (options.module && name) {
          symbols = symbols.filter((s) =>
            options.fuzzy
              ? s.symbolName.toLowerCase().includes(name.toLowerCase())
              : s.symbolName === name,
          );
        }
        if (options.kind && (name || options.module)) {
          symbols = symbols.filter((s) => s.symbolKind === options.kind);
        }

        if (options.json) {
          console.log(JSON.stringify(symbols, null, 2));
          return;
        }

        if (symbols.length === 0) {
          console.log("No matching symbols found.");
          return;
        }

        console.log(`Found ${symbols.length} symbol(s):\n`);

        for (const symbol of symbols) {
          console.log(`Name:        ${symbol.symbolName}`);
          console.log(`Kind:        ${symbol.symbolKind}`);
          console.log(`Module:      ${symbol.moduleName}`);
          console.log(`File:        ${symbol.filePath}:${symbol.lineNumber}`);
          if (symbol.signature) {
            console.log(`Signature:   ${symbol.signature}`);
          }
          if (symbol.documentation) {
            console.log(`Docstring:   ${symbol.documentation.trim()}`);
          }
          console.log("-".repeat(50));
        }
      } catch (error) {
        console.error(
          `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });
}
