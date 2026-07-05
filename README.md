# Project Index

A local-first developer tool that scans your repository and generates a machine-readable semantic index optimized for AI coding assistants.

**Project Index** creates a three-tier context system so AI agents can navigate your codebase without wastefully reading every file:

1. **Tier 1 — Symbol Registry** (`.agents/context/function_registry.md`): An always-loaded, compact listing of every function, class, interface, type, and enum grouped by module.
2. **Tier 2 — Query Command** (`project-index query <name>`): Returns the exact file path, line number, signature, and docstring for any symbol.
3. **Tier 3 — Targeted File Read**: The AI opens only the specific file at the exact line it needs.

## Installation

```bash
npm install -g project-index
```

Requires **Node.js ≥ 18**.

## Quick Start

```bash
# 1. Navigate to your project root
cd my-project

# 2. Initialize project-index (creates .project-index/ config and .agents/ scaffolding)
project-index init

# 3. Scan the repository to generate indexes
project-index scan

# 4. Query a symbol
project-index query "calculateTotal"
```

## Commands

### `project-index init`

Initializes the project for indexing:

- Creates `.project-index/` output directory
- Writes a default `.project-indexrc.json` configuration file

By default, scaffolds `.agents/` directory with:
- `AGENTS.md` — instructions for AI agents
- `skills/ai-navigable-modular-coding/` — bundled coding standards
- `context/` — where the generated symbol registry lives

**Options:**
- `--claude` — Initialize `.claude/` directory for Claude Code instead of `.agents/`
  - Creates `CLAUDE.md` with project guidance
  - Creates `settings.json` with default permissions
  - Creates `hooks/`, `agents/`, `commands/`, `scripts/` subdirectories
  - Copies `skills/ai-navigable-modular-coding/`
- `--all` — Initialize both `.agents/` and `.claude/` directories

### `project-index scan`

Performs a full repository scan:

- Discovers all TypeScript and Python source files
- Detects module and sub-module boundaries
- Extracts symbols (functions, classes, interfaces, types, enums) with signatures, docstrings, and line numbers
- Writes a SQLite database to `.project-index/`
- Generates `.agents/context/function_registry.md`

### `project-index query <name>`

Queries the index for a specific symbol:

```bash
# Exact match
project-index query "calculateTotal"

# Fuzzy search
project-index query "calcTotal" --fuzzy

# List all symbols in a module
project-index query --module "src"

# Filter by kind
project-index query --kind "function"

# JSON output (for programmatic use)
project-index query "calculateTotal" --json
```

**Output example:**

```
Name:        calculateTotal
Kind:        function
Module:      src
File:        src/main.ts:6
Signature:   function calculateTotal(price: number): number
Docstring:   Calculate the total price with a flat 10 dollars tax/fee.
```

### `project-index watch`

Starts a file watcher that performs an initial scan and then incrementally updates the index whenever source files change.

```bash
project-index watch
```

### `project-index validate`

Validates the generated index for consistency and completeness.

### `project-index statistics`

Displays summary statistics about the indexed repository (file counts, symbol counts, module breakdown).

### `project-index doctor`

Diagnoses common issues with the project-index setup (missing config, stale indexes, parser availability).

### `project-index clean`

Removes all generated output in `.project-index/`.

## Configuration

Project Index uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration discovery. Create a `.project-indexrc.json` at your project root:

```json
{
  "outputDirectory": ".project-index",
  "restrictToIncludePaths": ["src", "source", "lib"],
  "additionalIgnorePatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

## Supported Languages

| Language   | Parser           | Symbols Extracted                                    |
|------------|------------------|------------------------------------------------------|
| TypeScript | ts-morph         | Functions, classes, interfaces, types, enums, exports |
| Python     | web-tree-sitter  | Functions, classes, imports, decorators               |

## How It Works

```
your-project/
├── .project-index/          ← Generated index output
│   └── index.sqlite         ← SQLite database with all symbols
├── .agents/                 ← AI agent scaffolding
│   ├── AGENTS.md            ← Agent instructions
│   ├── context/
│   │   └── function_registry.md  ← Symbol registry (Tier 1)
│   └── skills/              ← Bundled coding standards
├── .project-indexrc.json    ← Configuration
└── src/                     ← Your source code
```

1. `project-index init` sets up the configuration and `.agents/` directory.
2. `project-index scan` parses your codebase and writes the index.
3. AI agents read `function_registry.md` to understand the codebase structure.
4. AI agents run `project-index query` to find exact file locations.
5. AI agents open only the files they need at the exact line numbers.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test

# Type-check
npm run lint

# Run from source (development)
npx tsx source/index.ts scan
```

## Module Structure

```
source/
├── contracts/                  — Shared data type definitions
├── configuration/              — User configuration loading and defaults
├── shared_utilities/           — Cross-cutting utilities (logger, hash, path, timer)
├── repository_scanning/        — File discovery, module detection, scan orchestration, watch mode
├── symbol_extraction/          — Language parsers
│   ├── typescript_parsing/     — TypeScript-specific extractors (ts-morph)
│   └── python_parsing/         — Python-specific extractors (tree-sitter)
├── index_generation/           — Transforms scan results into output files
├── persistent_storage/         — SQLite database generation and querying
├── agent_scaffolding/          — .agents/ directory initialization
└── command_line_interface/     — CLI commands
    └── commands/               — Individual command implementations
```

## License

[MIT](LICENSE)
