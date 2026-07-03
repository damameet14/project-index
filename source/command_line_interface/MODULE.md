# Command Line Interface

## Module purpose

Acts as the primary entry point for the Project Index CLI application. It parses terminal arguments, wires up dependencies, and delegates execution to the appropriate business modules.

## Owned responsibilities

- CLI argument parsing via Commander.js
- Defining and routing CLI commands (`scan`, `watch`, `clean`, `initialize`, `statistics`, `validate`, `doctor`)
- Formatting terminal output and handling top-level process exit codes
- Initializing the configuration loader and structured logger

## Responsibilities not owned

- Executing the repository scan (delegated to repository_scanning)
- Reading or writing persistent data (delegated to persistent_storage)
- Configuration file parsing (delegated to configuration)

## Public operations

### `createCommandLineProgram()`
- Success result: A Commander.js `Command` instance ready to parse `process.argv`
- Side effects: None directly, but executing the returned program triggers all CLI side effects

## Internal responsibility map

```text
commands/
  scan_command.ts        — Runs the indexer
  watch_command.ts       — Runs the indexer in watch mode
  clean_command.ts       — Deletes generated indexes
  initialize_command.ts  — Scaffolds a default configuration file
  statistics_command.ts  — Prints scan statistics
  validate_command.ts    — Validates generated indexes
  doctor_command.ts      — Checks environment dependencies
command_line_program.ts  — Main Commander.js program assembly
```

## Dependencies and side effects

- commander: CLI framework
- Modifies `process.exitCode` on failure
- Writes to `stdout`/`stderr` via the structured logger

## Tests

- Tested via overall integration tests in `tests/integration/`
