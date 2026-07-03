/**
 * SQLite database writer.
 *
 * Uses sql.js (WASM) to create and populate a SQLite database
 * containing all extracted symbols for fast machine queries.
 */

import initSqlJs, { type Database } from "sql.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { ExtractedSymbol } from "../contracts/index.js";
import type { ExtractedClass } from "../contracts/index.js";
import type { ExtractedFunction } from "../contracts/index.js";
import { logDebug, logInformation } from "../shared_utilities/index.js";

/**
 * Create and populate a SQLite database file with all extracted data.
 */
export async function writeSQLiteDatabaseFile(
  outputFilePath: string,
  extractedSymbols: ExtractedSymbol[],
  extractedClasses: ExtractedClass[],
  extractedFunctions: ExtractedFunction[],
): Promise<void> {
  const SQL = await initSqlJs();
  const database = new SQL.Database();

  try {
    createSymbolsDatabaseSchema(database);
    insertExtractedSymbolRecordsIntoDatabase(database, extractedSymbols);
    insertExtractedClassRecordsIntoDatabase(database, extractedClasses);
    insertExtractedFunctionRecordsIntoDatabase(database, extractedFunctions);
    createSymbolsDatabaseSearchIndexes(database);

    // Export to file
    const binaryData = database.export();
    const buffer = Buffer.from(binaryData);

    await mkdir(dirname(outputFilePath), { recursive: true });
    await writeFile(outputFilePath, buffer);

    logInformation(
      `SQLite database written: ${extractedSymbols.length} symbols, ` +
      `${extractedClasses.length} classes, ${extractedFunctions.length} functions`,
    );
  } finally {
    database.close();
  }
}

function createSymbolsDatabaseSchema(database: Database): void {
  database.run(`
    CREATE TABLE symbols (
      symbol_identifier TEXT PRIMARY KEY,
      symbol_name TEXT NOT NULL,
      symbol_kind TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      end_line_number INTEGER NOT NULL,
      language TEXT NOT NULL,
      module_name TEXT NOT NULL,
      visibility TEXT NOT NULL,
      documentation TEXT,
      signature TEXT,
      is_exported INTEGER NOT NULL DEFAULT 0
    );
  `);

  database.run(`
    CREATE TABLE classes (
      class_identifier TEXT PRIMARY KEY,
      class_name TEXT NOT NULL,
      module_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      base_class_name TEXT,
      is_abstract INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL,
      documentation TEXT,
      language TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE functions (
      function_identifier TEXT PRIMARY KEY,
      function_name TEXT NOT NULL,
      module_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      return_type TEXT,
      visibility TEXT NOT NULL,
      is_async INTEGER NOT NULL DEFAULT 0,
      is_generator INTEGER NOT NULL DEFAULT 0,
      is_exported INTEGER NOT NULL DEFAULT 0,
      documentation TEXT,
      language TEXT NOT NULL,
      containing_class_name TEXT
    );
  `);

  database.run(`
    CREATE TABLE symbol_relationships (
      source_symbol_identifier TEXT NOT NULL,
      relationship_kind TEXT NOT NULL,
      target_symbol_identifier TEXT NOT NULL,
      PRIMARY KEY (source_symbol_identifier, relationship_kind, target_symbol_identifier)
    );
  `);

  logDebug("SQLite database schema created.");
}

function insertExtractedSymbolRecordsIntoDatabase(
  database: Database,
  symbols: ExtractedSymbol[],
): void {
  const statement = database.prepare(`
    INSERT OR REPLACE INTO symbols (
      symbol_identifier, symbol_name, symbol_kind, file_path,
      line_number, end_line_number, language, module_name,
      visibility, documentation, signature, is_exported
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const symbol of symbols) {
    statement.run([
      symbol.symbolIdentifier,
      symbol.symbolName,
      symbol.symbolKind,
      symbol.filePath,
      symbol.lineNumber,
      symbol.endLineNumber,
      symbol.language,
      symbol.moduleName,
      symbol.visibility,
      symbol.documentation,
      symbol.signature,
      symbol.isExported ? 1 : 0,
    ]);

    // Insert relationships
    for (const relationship of symbol.relationships) {
      database.run(
        `INSERT OR IGNORE INTO symbol_relationships (
          source_symbol_identifier, relationship_kind, target_symbol_identifier
        ) VALUES (?, ?, ?);`,
        [
          symbol.symbolIdentifier,
          relationship.relationshipKind,
          relationship.targetSymbolIdentifier,
        ],
      );
    }
  }

  statement.free();
}

function insertExtractedClassRecordsIntoDatabase(
  database: Database,
  classes: ExtractedClass[],
): void {
  const statement = database.prepare(`
    INSERT OR REPLACE INTO classes (
      class_identifier, class_name, module_name, file_path,
      line_number, base_class_name, is_abstract, visibility,
      documentation, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const classEntry of classes) {
    statement.run([
      classEntry.classIdentifier,
      classEntry.className,
      classEntry.moduleName,
      classEntry.filePath,
      classEntry.lineNumber,
      classEntry.baseClassName,
      classEntry.isAbstract ? 1 : 0,
      classEntry.visibility,
      classEntry.documentation,
      classEntry.language,
    ]);
  }

  statement.free();
}

function insertExtractedFunctionRecordsIntoDatabase(
  database: Database,
  functions: ExtractedFunction[],
): void {
  const statement = database.prepare(`
    INSERT OR REPLACE INTO functions (
      function_identifier, function_name, module_name, file_path,
      line_number, return_type, visibility, is_async, is_generator,
      is_exported, documentation, language, containing_class_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const functionEntry of functions) {
    statement.run([
      functionEntry.functionIdentifier,
      functionEntry.functionName,
      functionEntry.moduleName,
      functionEntry.filePath,
      functionEntry.lineNumber,
      functionEntry.returnType,
      functionEntry.visibility,
      functionEntry.isAsync ? 1 : 0,
      functionEntry.isGenerator ? 1 : 0,
      functionEntry.isExported ? 1 : 0,
      functionEntry.documentation,
      functionEntry.language,
      functionEntry.containingClassName,
    ]);
  }

  statement.free();
}

function createSymbolsDatabaseSearchIndexes(database: Database): void {
  database.run("CREATE INDEX idx_symbols_name ON symbols (symbol_name);");
  database.run("CREATE INDEX idx_symbols_kind ON symbols (symbol_kind);");
  database.run("CREATE INDEX idx_symbols_module ON symbols (module_name);");
  database.run("CREATE INDEX idx_symbols_file ON symbols (file_path);");
  database.run("CREATE INDEX idx_classes_module ON classes (module_name);");
  database.run("CREATE INDEX idx_functions_module ON functions (module_name);");
  database.run("CREATE INDEX idx_relationships_target ON symbol_relationships (target_symbol_identifier);");

  logDebug("SQLite database indexes created.");
}
