# Project Index

## Project purpose

Project Index is a local-first developer tool that continuously scans a software repository and generates a machine-readable semantic index optimized for AI coding assistants.

## Applications

This is a single command-line application (not a multi-application project).

## Modules

```text
source/
├── contracts/                  — Shared data type definitions (all output schemas)
├── configuration/              — User configuration loading and defaults
├── shared_utilities/           — Cross-cutting utilities (logger, hash, path, timer)
├── repository_scanning/        — File discovery, module detection, scan orchestration, watch mode
├── symbol_extraction/          — Language parsers (TypeScript via ts-morph, Python via tree-sitter)
│   ├── typescript_parsing/     — TypeScript-specific extractors
│   └── python_parsing/         — Python-specific extractors
├── index_generation/           — Transforms scan results into output files
├── persistent_storage/         — Atomic JSON writing and SQLite database generation
└── command_line_interface/     — CLI commands (init, scan, watch, validate, statistics, clean, doctor)
    └── commands/               — Individual command implementations
```

## Technologies

- TypeScript (ESM)
- ts-morph (TypeScript Compiler API wrapper)
- web-tree-sitter (WASM-based Python parser)
- Commander.js (CLI framework)
- chokidar (file watcher)
- sql.js (SQLite via WASM)
- cosmiconfig (config file discovery)

## Conventions

- Source directory: `source/` (not `src/`)
- All names use complete descriptive words (no abbreviations)
- TypeScript camelCase for variables/functions, PascalCase for types/classes
- File names use snake_case describing the primary responsibility
- Each module has a barrel export `index.ts` as its public interface
- External modules import only from the public interface

## Setup & Installation

To set up the project locally for development:

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build the project:**
   ```bash
   npm run build
   ```
3. **Run tests:**
   ```bash
   npm run test
   ```

## Usage

You can run the CLI tool directly from the source code during development using `tsx`, or you can run the compiled JavaScript.

**Initialize configuration:**
```bash
npx tsx source/index.ts init
```

**Run a repository scan:**
```bash
npx tsx source/index.ts scan
```

**Watch mode (continuously update on file changes):**
```bash
npx tsx source/index.ts watch
```

*(Note: If you have already built the project, you can replace `npx tsx source/index.ts` with `node dist/index.js`)*
