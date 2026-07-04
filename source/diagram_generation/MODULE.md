# Module: diagram_generation

> Automatically generates Mermaid architecture flowcharts and execution sequence diagrams for each detected module.

## Owned Responsibilities

- Generating Mermaid `flowchart TD` diagrams illustrating module structure, public interfaces, internal implementations, and dependencies.
- Generating Mermaid `sequenceDiagram` diagrams illustrating execution interaction flows from public entry points down to internal logic and external dependencies.
- Outputting formatted diagram markdown files into `docs/diagrams/` and `.agents/diagrams/` during indexing.

## Explicitly Not Owned

- Source file scanning or parsing (owned by `repository_scanning` and `symbol_extraction`).
- Index JSON or SQLite persistence (owned by `index_generation` and `persistent_storage`).

## Public Interface

- `generateAllModuleDiagramFiles`: Writes flowchart and sequence diagram markdown files for all detected modules to `docs/diagrams/` and `.agents/diagrams/`.
- `generateModuleDiagramMarkdown`: Synthesizes the complete diagram markdown content for a single module.
- `generateModuleFlowchartDiagram`: Generates Mermaid flowchart TD diagram string.
- `generateModuleSequenceDiagram`: Generates Mermaid sequence diagram string.

## Dependencies

- Requires `DetectedModule`, `ExtractedSymbol`, `ExtractedFileDependency` contracts from `source/contracts`.
