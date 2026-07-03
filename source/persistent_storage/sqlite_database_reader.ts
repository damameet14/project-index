/**
 * SQLite database reader.
 *
 * Provides functions to query the symbols.sqlite database.
 */

import initSqlJs from "sql.js";
import { readFile } from "node:fs/promises";
import type { ExtractedSymbol } from "../contracts/index.js";

async function runQuery(
  databasePath: string,
  sql: string,
  params: any[] = [],
): Promise<any[]> {
  const SQL = await initSqlJs();
  const fileBuffer = await readFile(databasePath);
  const db = new SQL.Database(new Uint8Array(fileBuffer));
  try {
    const statement = db.prepare(sql);
    statement.bind(params);
    const results: any[] = [];
    while (statement.step()) {
      results.push(statement.getAsObject());
    }
    statement.free();
    return results;
  } finally {
    db.close();
  }
}

function mapRowToSymbol(row: any): ExtractedSymbol {
  return {
    symbolIdentifier: row.symbol_identifier,
    symbolName: row.symbol_name,
    symbolKind: row.symbol_kind,
    filePath: row.file_path,
    lineNumber: row.line_number,
    endLineNumber: row.end_line_number,
    language: row.language,
    moduleName: row.module_name,
    visibility: row.visibility,
    documentation: row.documentation,
    signature: row.signature,
    isExported: row.is_exported === 1,
    relationships: [],
  };
}

/**
 * Query symbols from database by name.
 */
export async function querySymbolsByName(
  databasePath: string,
  symbolName: string,
  isFuzzySearch: boolean = false,
): Promise<ExtractedSymbol[]> {
  const sql = isFuzzySearch
    ? "SELECT * FROM symbols WHERE symbol_name LIKE ? ORDER BY symbol_name"
    : "SELECT * FROM symbols WHERE symbol_name = ? ORDER BY symbol_name";
  const params = [isFuzzySearch ? `%${symbolName}%` : symbolName];
  const rows = await runQuery(databasePath, sql, params);
  return rows.map(mapRowToSymbol);
}

/**
 * Query symbols from database by module.
 */
export async function querySymbolsByModule(
  databasePath: string,
  moduleName: string,
): Promise<ExtractedSymbol[]> {
  const sql = "SELECT * FROM symbols WHERE module_name = ? ORDER BY symbol_name";
  const rows = await runQuery(databasePath, sql, [moduleName]);
  return rows.map(mapRowToSymbol);
}

/**
 * Query symbols from database by kind.
 */
export async function querySymbolsByKind(
  databasePath: string,
  symbolKind: string,
): Promise<ExtractedSymbol[]> {
  const sql = "SELECT * FROM symbols WHERE symbol_kind = ? ORDER BY symbol_name";
  const rows = await runQuery(databasePath, sql, [symbolKind]);
  return rows.map(mapRowToSymbol);
}
