# Data Contracts

## Module purpose

Defines all shared TypeScript interfaces and types used as data contracts between modules. Every generated output file schema (context.json, modules.json, symbols.json, etc.) is defined here.

## Owned responsibilities

- Symbol type definitions (kinds, visibility, relationships)
- Module type definitions
- Class type definitions (methods, properties, parameters)
- Function type definitions
- Dependency type definitions (file dependencies, module edges, circular detection)
- Project context type definitions (AI entry point schema)
- Scan statistics type definitions
- Scan result type definitions (single file and full repository)

## Responsibilities not owned

- Parsing source files (owned by symbol_extraction)
- Generating output files (owned by index_generation)
- Writing files to disk (owned by persistent_storage)

## Public operations

This module exports only TypeScript type definitions. No runtime operations.

## Internal responsibility map

```text
symbol_contracts.ts            — Symbol kinds, visibility, relationships
module_contracts.ts            — Detected module shape
class_contracts.ts             — Class, method, property, parameter shapes
function_contracts.ts          — Function shape
dependency_contracts.ts        — File and module dependency shapes
project_context_contracts.ts   — context.json schema
scan_statistics_contracts.ts   — statistics.json schema
scan_result_contracts.ts       — Single file and full scan result shapes
index.ts                       — Barrel export (public interface)
```

## Dependencies and side effects

- None. This module has zero runtime dependencies.

## Tests

- Contract correctness is validated by TypeScript compiler (compile-time checks).
