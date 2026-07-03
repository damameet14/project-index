# Shared Utilities

## Module purpose

Provides cross-cutting utilities and helper functions that are entirely agnostic to the business logic of Project Index, such as logging, path manipulation, and performance measurement.

## Owned responsibilities

- Structured CLI logging
- File path normalization and manipulation
- Content and object hashing
- Performance timers

## Responsibilities not owned

- Domain-specific logic
- Configuration state
- I/O (beyond writing to `stdout`/`stderr` via logger)

## Public operations

### Logger (`logInformation`, `logError`, etc.)
- Side effects: Writes structured messages to the console

### `calculateContentHash(content)` / `calculateObjectHash(obj)`
- Success result: SHA-256 hash string

### `normalizeToForwardSlashes(path)`, `convertToRelativePath(root, path)`, etc.
- Success result: Normalized path string

### `startPerformanceTimer()`
- Success result: Timer object with `.stop()` yielding execution duration

## Internal responsibility map

```text
content_hash_calculator.ts   — Cryptographic hashing
path_normalizer.ts           — OS-agnostic path manipulation
performance_timer.ts         — High-resolution timing
structured_logger.ts         — Console logging
index.ts                     — Barrel export (public interface)
```

## Dependencies and side effects

- `node:crypto`: Hashing
- `node:path`: Path math
- Writes to `console` (stdout/stderr)

## Tests

- Unit tests: `tests/unit/shared_utilities/path_normalizer.test.ts`
