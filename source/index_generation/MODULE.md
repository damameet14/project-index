# Index Generation

## Module purpose

Transforms raw parsed AST data (extracted symbols, classes, functions, and dependencies) into the final structured output artifacts (JSON and SQLite schema).

## Owned responsibilities

- Building the global Dependency Graph
- Detecting and reporting circular dependency chains
- Generating the Project Context (context.json) summary
- Aggregating Scan Statistics (statistics.json)
- Orchestrating the creation of all index files (modules.json, symbols.json, classes.json, functions.json, dependencies.json)

## Responsibilities not owned

- Extracting the raw symbols from source code (owned by symbol_extraction)
- Writing the generated artifacts to disk (owned by persistent_storage)

## Public operations

### `generateAllIndexOutputFiles(input)`
- Request: `IndexGenerationInput` (Parsed files, config, repo path)
- Side effects: Writes generated JSON and SQLite artifacts to disk via `persistent_storage`

## Internal responsibility map

```text
dependency_graph_builder.ts    — Edges and circular cycle detection
index_output_file_generator.ts — Main generation coordinator
index.ts                       — Barrel export (public interface)
```

## Dependencies and side effects

- Calls `persistent_storage` to perform I/O operations

## Tests

- Unit tests: `tests/unit/index_generation/dependency_graph_builder.test.ts`
