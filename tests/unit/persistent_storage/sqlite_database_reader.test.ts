import { describe, it, expect, afterAll } from "vitest";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeSQLiteDatabaseFile } from "../../../source/persistent_storage/sqlite_database_writer.js";
import {
  querySymbolsByName,
  querySymbolsByModule,
  querySymbolsByKind,
} from "../../../source/persistent_storage/sqlite_database_reader.js";
import type { ExtractedSymbol, ExtractedClass, ExtractedFunction } from "../../../source/contracts/index.js";

describe("SQLite Database Reader", () => {
  const tempDbPath = join(__dirname, "temp_test_symbols.sqlite");

  afterAll(async () => {
    if (existsSync(tempDbPath)) {
      await rm(tempDbPath, { force: true });
    }
  });

  it("writes and queries symbols database correctly", async () => {
    const symbols: ExtractedSymbol[] = [
      {
        symbolIdentifier: "moduleA::func1",
        symbolName: "func1",
        symbolKind: "function",
        filePath: "source/moduleA/func1.ts",
        lineNumber: 10,
        endLineNumber: 20,
        language: "typescript",
        moduleName: "moduleA",
        visibility: "public",
        documentation: "This is func1 description.",
        signature: "export function func1()",
        isExported: true,
        relationships: [],
      },
      {
        symbolIdentifier: "moduleB::Class2",
        symbolName: "Class2",
        symbolKind: "class",
        filePath: "source/moduleB/Class2.ts",
        lineNumber: 5,
        endLineNumber: 45,
        language: "typescript",
        moduleName: "moduleB",
        visibility: "public",
        documentation: "Class2 documentation.",
        signature: "export class Class2",
        isExported: true,
        relationships: [],
      },
    ];

    const classes: ExtractedClass[] = [];
    const functions: ExtractedFunction[] = [];

    // Write database
    await writeSQLiteDatabaseFile(tempDbPath, symbols, classes, functions);
    expect(existsSync(tempDbPath)).toBe(true);

    // Test exact name query
    const results1 = await querySymbolsByName(tempDbPath, "func1", false);
    expect(results1.length).toBe(1);
    expect(results1[0].symbolName).toBe("func1");
    expect(results1[0].documentation).toBe("This is func1 description.");

    // Test fuzzy name query
    const results2 = await querySymbolsByName(tempDbPath, "Class", true);
    expect(results2.length).toBe(1);
    expect(results2[0].symbolName).toBe("Class2");

    // Test module query
    const results3 = await querySymbolsByModule(tempDbPath, "moduleA");
    expect(results3.length).toBe(1);
    expect(results3[0].symbolName).toBe("func1");

    // Test kind query
    const results4 = await querySymbolsByKind(tempDbPath, "class");
    expect(results4.length).toBe(1);
    expect(results4[0].symbolName).toBe("Class2");
  });
});
