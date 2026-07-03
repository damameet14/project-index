# Repository Scanning

## Module purpose

Discovers source files, detects project modules, orchestrates the full scan pipeline, and provides watch mode for continuous index updates.

## Owned responsibilities

- File discovery with ignore pattern resolution (.gitignore + defaults)
- Programming language detection from file extensions
- Project module and monorepo sub-project detection
- Scan pipeline orchestration (discover → parse → generate)
- File change watching via chokidar

## Responsibilities not owned

- Parsing source file ASTs (owned by symbol_extraction)
- Generating output files (owned by index_generation)
- Writing files to disk (owned by persistent_storage)
- CLI command handling (owned by command_line_interface)

## Public operations

### `executeRepositoryScan(request)`
- Request: `RepositoryScanRequest` (root path + configuration)
- Side effects: Reads all source files, writes all output files to .project-index/

### `startFileChangeWatcher(request)`
- Request: `FileChangeWatcherRequest` (root path + configuration)
- Side effects: Performs initial scan, then watches for file changes indefinitely

## Internal responsibility map

```text
ignore_pattern_resolver.ts             — .gitignore + defaults + user patterns
programming_language_detector.ts       — File extension → language mapping
project_module_detector.ts             — Module boundary detection (monorepo aware)
repository_scanner_orchestrator.ts     — Full scan pipeline coordination
file_change_watcher.ts                 — chokidar-based file watching
index.ts                               — Barrel export (public interface)
```

## Dependencies and side effects

- chokidar: File system watching (persistent process)
- ignore: .gitignore parsing
- Reads from file system
- Writes to .project-index/ directory

## Tests

- Integration tests: `tests/integration/scan.test.ts`
