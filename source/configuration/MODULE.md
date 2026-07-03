# Configuration

## Module purpose

Provides the configuration schema, default values, and loading mechanism for the Project Index tool. It resolves user-provided configuration files (`.project-indexrc.json`) and merges them with application defaults.

## Owned responsibilities

- Defining the `ProjectIndexConfiguration` schema
- Providing default configuration values
- Loading and parsing `.project-indexrc.json` from the repository root
- Merging user configuration with defaults

## Responsibilities not owned

- Validating file paths within the configuration (owned by repository_scanning)
- Command-line argument parsing (owned by command_line_interface)

## Public operations

### `loadProjectIndexConfiguration(repositoryRootPath)`
- Request: Absolute path to the repository root
- Success result: A fully resolved `ProjectIndexConfiguration` object
- Side effects: Reads `.project-indexrc.json` from disk if it exists

## Internal responsibility map

```text
configuration_schema.ts  — Configuration type definition and defaults
configuration_loader.ts  — File loading and merging logic
index.ts                 — Barrel export (public interface)
```

## Dependencies and side effects

- Reads `.project-indexrc.json` from the filesystem

## Tests

- Unit tests: `tests/unit/configuration/configuration_loader.test.ts`
