# Symbol Extraction

## Module purpose

Parses source files in supported programming languages and extracts structured symbol information (classes, functions, interfaces, enums, variables, constants, dependencies).

## Owned responsibilities

- Defining the language parser interface contract
- Maintaining the parser registry (language → parser mapping)
- TypeScript and JavaScript source file parsing via ts-morph
- Python source file parsing via web-tree-sitter (WASM)
- Extracting symbols, classes, functions, and dependencies from parsed ASTs

## Responsibilities not owned

- File discovery and module detection (owned by repository_scanning)
- Output file generation (owned by index_generation)
- Data contract definitions (owned by contracts)

## Public operations

### `LanguageParserRegistry.getParserForLanguage(languageName)`
- Returns the appropriate parser implementation, lazily initialized
- Side effects: First call initializes the parser (loads WASM, creates ts-morph Project)

### `LanguageParserInterface.parseSourceFile(absoluteFilePath, fileContent, moduleName, relativeFilePath)`
- Request: file path, content, module context
- Success result: `SingleFileParseResult` containing symbols, classes, functions, dependencies
- Side effects: None (pure parsing)

## Internal responsibility map

```text
language_parser_interface.ts          — Parser contract definition
language_parser_registry.ts           — Language → parser mapping
typescript_parsing/
  typescript_source_file_parser.ts    — ts-morph parser implementation
  typescript_symbol_extractor.ts      — Symbol extraction from TS AST
  typescript_class_extractor.ts       — Class detail extraction
  typescript_function_extractor.ts    — Function detail extraction
  typescript_dependency_extractor.ts  — Import/export extraction
python_parsing/
  python_source_file_parser.ts        — tree-sitter parser implementation
  python_symbol_extractor.ts          — Symbol extraction from Python AST
  python_class_extractor.ts           — Class detail extraction
  python_function_extractor.ts        — Function detail extraction
  python_dependency_extractor.ts      — Import statement extraction
index.ts                              — Barrel export (public interface)
```

## Dependencies and side effects

- ts-morph: TypeScript Compiler API wrapper (lazy initialization)
- web-tree-sitter: WASM-based parser (requires Python grammar .wasm file)

## Tests

- Unit tests: `tests/unit/parsers/`
