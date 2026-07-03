import { describe, it, expect } from "vitest";
import { generateSymbolRegistryMarkdown } from "../../../source/index_generation/symbol_registry_generator.js";
import type { ExtractedSymbol, DetectedModule } from "../../../source/contracts/index.js";

describe("Symbol Registry Generator", () => {
  it("groups and formats symbols correctly by module and kind", () => {
    const modules: DetectedModule[] = [
      { moduleName: "root", locationPath: ".", purpose: "Root application" } as unknown as DetectedModule,
      { moduleName: "source/repository_scanning", locationPath: "source/repository_scanning", purpose: "Orchestrates files" } as unknown as DetectedModule,
    ];

    const symbols: ExtractedSymbol[] = [
      {
        symbolName: "executeRepositoryScan",
        symbolKind: "function",
        moduleName: "source/repository_scanning",
      } as unknown as ExtractedSymbol,
      {
        symbolName: "IgnorePatternResolver",
        symbolKind: "class",
        moduleName: "source/repository_scanning",
      } as unknown as ExtractedSymbol,
      {
        symbolName: "CommandLineInterface",
        symbolKind: "class",
        moduleName: "root",
      } as unknown as ExtractedSymbol,
      {
        symbolName: "checkSomething",
        symbolKind: "function",
        moduleName: "root",
      } as unknown as ExtractedSymbol,
    ];

    const markdown = generateSymbolRegistryMarkdown(modules, symbols);

    expect(markdown).toContain("# Symbol Registry");
    expect(markdown).toContain("## Module: root");
    expect(markdown).toContain("> Root application");
    expect(markdown).toContain("### Classes\n- CommandLineInterface");
    expect(markdown).toContain("### Functions\n- checkSomething");

    expect(markdown).toContain("## Module: source/repository_scanning");
    expect(markdown).toContain("> Orchestrates files");
    expect(markdown).toContain("### Classes\n- IgnorePatternResolver");
    expect(markdown).toContain("### Functions\n- executeRepositoryScan");
  });
});
