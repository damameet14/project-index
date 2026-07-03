import { describe, it, expect } from "vitest";
import { buildDependencyGraph } from "../../../source/index_generation/index_output_file_generator.js";
import type { ExtractedFileDependency } from "../../../source/contracts/dependency_contracts.js";
import type { DetectedModule } from "../../../source/contracts/module_contracts.js";

describe("Dependency Graph Builder", () => {
  it("builds a simple graph without cycles", () => {
    const fileDependencies: ExtractedFileDependency[] = [
      {
        sourceFilePath: "moduleA/a.ts",
        importSpecifier: "../moduleB/b.ts",
        resolvedTargetFilePath: "moduleB/b.ts",
        classification: "internal",
        importedSymbolNames: [],
        isNamespaceImport: false,
        isDefaultImport: false,
        isReexport: false,
        lineNumber: 1,
      },
      {
        sourceFilePath: "moduleB/b.ts",
        importSpecifier: "../moduleC/c.ts",
        resolvedTargetFilePath: "moduleC/c.ts",
        classification: "internal",
        importedSymbolNames: [],
        isNamespaceImport: false,
        isDefaultImport: false,
        isReexport: false,
        lineNumber: 1,
      },
    ];

    const modules: DetectedModule[] = [
      { moduleName: "moduleA", locationPath: "moduleA", containedFilePaths: ["moduleA/a.ts"], publicInterfaceSymbolIdentifiers: [], purpose: "" } as unknown as DetectedModule,
      { moduleName: "moduleB", locationPath: "moduleB", containedFilePaths: ["moduleB/b.ts"], publicInterfaceSymbolIdentifiers: [], purpose: "" } as unknown as DetectedModule,
      { moduleName: "moduleC", locationPath: "moduleC", containedFilePaths: ["moduleC/c.ts"], publicInterfaceSymbolIdentifiers: [], purpose: "" } as unknown as DetectedModule,
    ];
    const graph = buildDependencyGraph(fileDependencies, modules);

    expect(graph.moduleDependencies.length).toBe(2);
    expect(graph.circularDependencies.length).toBe(0);
  });

  it("detects a simple A -> B -> A cycle", () => {
    const fileDependencies: ExtractedFileDependency[] = [
      {
        sourceFilePath: "moduleA/a.ts",
        importSpecifier: "../moduleB/b.ts",
        resolvedTargetFilePath: "moduleB/b.ts",
        classification: "internal",
        importedSymbolNames: [],
        isNamespaceImport: false,
        isDefaultImport: false,
        isReexport: false,
        lineNumber: 1,
      },
      {
        sourceFilePath: "moduleB/b.ts",
        importSpecifier: "../moduleA/a.ts",
        resolvedTargetFilePath: "moduleA/a.ts",
        classification: "internal",
        importedSymbolNames: [],
        isNamespaceImport: false,
        isDefaultImport: false,
        isReexport: false,
        lineNumber: 1,
      },
    ];

    const modules: DetectedModule[] = [
      { moduleName: "moduleA", locationPath: "moduleA", containedFilePaths: ["moduleA/a.ts"], publicInterfaceSymbolIdentifiers: [], purpose: "" } as unknown as DetectedModule,
      { moduleName: "moduleB", locationPath: "moduleB", containedFilePaths: ["moduleB/b.ts"], publicInterfaceSymbolIdentifiers: [], purpose: "" } as unknown as DetectedModule,
    ];
    const graph = buildDependencyGraph(fileDependencies, modules);

    expect(graph.circularDependencies.length).toBeGreaterThan(0);
    expect(graph.circularDependencies[0].moduleNamesInCycle).toContain("moduleA");
    expect(graph.circularDependencies[0].moduleNamesInCycle).toContain("moduleB");
  });
});
