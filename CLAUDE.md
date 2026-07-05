# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Index** is a local-first developer tool that scans repositories and generates machine-readable semantic indexes optimized for AI coding assistants. It creates a three-tier context system: a compact symbol registry (Tier 1), a query CLI for exact symbol lookups (Tier 2), and targeted file reads at exact line numbers (Tier 3).

## Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build the project with tsup (outputs to `dist/`) |
| `npm run development` | Build with watch mode for development |
| `npm run test` | Run all tests with vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:unit` | Run unit tests only (`tests/unit/`) |
| `npm run test:integration` | Run integration tests only (`tests/integration/`) |
| `npm run lint` | Type-check with TypeScript (no emit) |
| `npm run prepare` | Runs build (called automatically on npm pack/publish) |

### Running from Source (Development)

```bash
npx tsx source/index.ts scan
```

### Single Test Execution

```bash
npx vitest run tests/unit/repository_scanning/programming_language_detector.test.ts
```

## Architecture

### Module Structure

```
source/
├── contracts/                   — Shared data type definitions (TypeScript interfaces)
├── configuration/               — User config loading via cosmiconfig, defaults
├── shared_utilities/            — Cross-cutting: logger, hash, path, timer
├── repository_scanning/         — File discovery, module detection, scan orchestration, watch mode
├── symbol_extraction/           — Language parsers
│   ├── typescript_parsing/      — TypeScript extractors (ts-morph)
│   └── python_parsing/          — Python extractors (tree-sitter)
├── index_generation/            — Transforms scan results into JSON + SQLite output
├── persistent_storage/          — SQLite database generation and querying
├── agent_scaffolding/           — .agents/ directory initialization
└── command_line_interface/      — CLI commands (Commander.js)
    └── commands/                — Individual command implementations
```

### Key Data Flow

1. **Scan** (`project-index scan`): `repository_scanner_orchestrator.executeRepositoryScan()`
   - Discovers files via `project_module_detector.detectProjectModules()`
   - Parses via `LanguageParserRegistry` → `TypeScriptSourceFileParser` / `PythonSourceFileParser`
   - Generates output via `index_generation.generateAllIndexOutputFiles()`

2. **Output Files** (written to `.project-index/`):
   - `context.json` — Project context summary for AI agents
   - `modules.json` — Detected modules with dependencies
   - `symbols.json` — All extracted symbols
   - `classes.json`, `functions.json` — Specialized views
   - `dependencies.json` — File/module dependency graph + circular deps
   - `statistics.json` — Scan metrics
   - `metadata.json` — Schema version, config hash, file content hashes
   - `symbols.sqlite` — SQLite database for fast queries
   - `.agents/context/function_registry.md` — Human-readable symbol registry

3. **Query** (`project-index query`): Reads from `symbols.sqlite` via `persistent_storage` query functions

4. **Watch** (`project-index watch`): Uses `file_change_watcher.startFileChangeWatcher()` with chokidar for incremental updates

### Supported Languages

| Language | Parser | Symbols Extracted |
|----------|--------|-------------------|
| TypeScript | ts-morph | Functions, classes, interfaces, types, enums, exports |
| JavaScript | ts-morph | Same as TypeScript |
| Python | web-tree-sitter | Functions, classes, imports, decorators |

### Configuration

Uses cosmiconfig. Config file: `.project-indexrc.json` at project root.

```json
{
  "outputDirectoryName": ".project-index",
  "enabledLanguages": ["typescript", "javascript", "python"],
  "isMonorepoDetectionEnabled": true,
  "additionalIgnorePatterns": [],
  "restrictToIncludePaths": []
}
```

### Path Aliases (tsconfig.json)

| Alias | Maps To |
|-------|---------|
| `#contracts/*` | `source/contracts/*` |
| `#symbol-extraction/*` | `source/symbol_extraction/*` |
| `#index-generation/*` | `source/index_generation/*` |
| `#repository-scanning/*` | `source/repository_scanning/*` |
| `#command-line-interface/*` | `source/command_line_interface/*` |
| `#persistent-storage/*` | `source/persistent_storage/*` |
| `#shared-utilities/*` | `source/shared_utilities/*` |
| `#configuration/*` | `source/configuration/*` |

### CLI Commands

- `init` — Initialize `.project-index/` dir, config file, `.agents/` scaffolding
- `scan` — Full repository scan, generate all indexes
- `watch` — Continuous file watcher with incremental updates
- `validate` — Verify indexes match current source (compares file hashes)
- `statistics` — Print repository statistics from generated index
- `doctor` — Diagnose setup issues (missing config, stale indexes, parser availability)
- `clean` — Remove generated `.project-index/` directory
- `query` — Query symbols from SQLite database (name, module, kind, fuzzy)

## Testing

- Framework: Vitest
- Unit tests in `tests/unit/` — test individual modules in isolation
- Integration tests in `tests/integration/` — test full pipelines
- Run specific test: `npx vitest run <path-to-test-file>`

## Key Implementation Details

- **ESM only** (`"type": "module"` in package.json)
- **Node.js ≥ 18** required
- **Strict TypeScript** with `strict: true`, explicit `moduleResolution: NodeNext`
- **Logging**: Structured logger in `shared_utilities/structured_logger.ts` with levels (debug, info, warning, error, success)
- **Hashing**: Content hashes for file change detection (`content_hash_calculator.ts`)
- **Performance timing**: `performance_timer.ts` for measuring scan phases
- **Path normalization**: `path_normalizer.ts` for cross-platform path handling