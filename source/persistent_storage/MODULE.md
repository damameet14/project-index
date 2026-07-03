# Persistent Storage

## Module purpose

Isolates all file system write operations and database interactions. It serves as the single integration point for persisting the generated index artifacts to disk.

## Owned responsibilities

- Writing JSON files to disk atomically
- Writing data to SQLite databases
- Managing output directories and ensuring they exist before writing

## Responsibilities not owned

- Generating the data payload (owned by index_generation)
- Defining the database schema types (owned by contracts)

## Public operations

### `writeJSONFileAtomically(filePath, data)`
- Request: Absolute file path, object to serialize
- Side effects: Writes data to disk atomically to prevent partial writes

### `writeMultipleJSONFiles(directoryPath, files)`
- Request: Absolute directory path, map of filenames to objects
- Side effects: Writes multiple JSON files to the target directory

### `writeSQLiteDatabaseFile(filePath, allSymbols, allClasses, allFunctions)`
- Request: Absolute file path, array of extracted entities
- Side effects: Creates and populates an SQLite database file

## Internal responsibility map

```text
atomic_json_file_writer.ts   — Atomic JSON persistence
sqlite_database_writer.ts    — SQLite (`sql.js`) persistence
index.ts                     — Barrel export (public interface)
```

## Dependencies and side effects

- `sql.js`: SQLite WASM engine
- `node:fs`, `node:path`: Filesystem I/O
- Writes to disk exclusively

## Tests

- Tested via integration tests
