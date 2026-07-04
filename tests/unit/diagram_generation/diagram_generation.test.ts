import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateModuleFlowchartDiagram,
  generateModuleSequenceDiagram,
  generateModuleDiagramMarkdown,
  generateAllModuleDiagramFiles,
} from "../../../source/diagram_generation/index.js";
import type { DetectedModule, ExtractedSymbol, ExtractedFileDependency } from "../../../source/contracts/index.js";
import { writeFile, mkdir } from "node:fs/promises";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Diagram Generation Module", () => {
  const sampleModule: DetectedModule = {
    moduleName: "source/user_authentication",
    purpose: "Manages user authentication and tokens",
    locationPath: "source/user_authentication",
    publicInterfaceSymbolIdentifiers: ["source/user_authentication::authenticateUser"],
    dependencyModuleNames: ["source/database"],
    dependentModuleNames: [],
    detectedTechnologies: ["typescript"],
    status: "active",
    containedFilePaths: ["source/user_authentication/authenticator.ts"],
    containedLanguages: ["typescript"],
    entryPointFilePath: "source/user_authentication/authenticator.ts",
  };

  const sampleSymbols: ExtractedSymbol[] = [
    {
      symbolIdentifier: "source/user_authentication::authenticateUser",
      symbolName: "authenticateUser",
      symbolKind: "function",
      moduleName: "source/user_authentication",
      filePath: "source/user_authentication/authenticator.ts",
      lineNumber: 10,
      endLineNumber: 25,
      signature: "export function authenticateUser(credentials: UserCredentials): Promise<AuthToken>",
      documentation: "Authenticates user against database",
      visibility: "public",
      isExported: true,
      language: "typescript",
      relationships: [],
    },
    {
      symbolIdentifier: "source/user_authentication::verifyPasswordHash",
      symbolName: "verifyPasswordHash",
      symbolKind: "function",
      moduleName: "source/user_authentication",
      filePath: "source/user_authentication/authenticator.ts",
      lineNumber: 27,
      endLineNumber: 35,
      signature: "function verifyPasswordHash(plainPassword: string, hash: string): boolean",
      documentation: "Internal password hash check",
      visibility: "private",
      isExported: false,
      language: "typescript",
      relationships: [],
    },
  ];

  const sampleDependencies: ExtractedFileDependency[] = [
    {
      sourceFilePath: "source/user_authentication/authenticator.ts",
      importSpecifier: "../database/index.js",
      resolvedTargetFilePath: "source/database/index.ts",
      importedSymbolNames: ["queryUserByEmail"],
      isNamespaceImport: false,
      isDefaultImport: false,
      isReexport: false,
      classification: "internal",
      lineNumber: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates valid Mermaid flowchart diagram", () => {
    const flowchart = generateModuleFlowchartDiagram(
      sampleModule,
      sampleSymbols,
      sampleDependencies,
      [sampleModule],
    );

    expect(flowchart).toContain("flowchart TD");
    expect(flowchart).toContain("subgraph PublicInterface[\"Public Interface\"]");
    expect(flowchart).toContain("subgraph InternalImplementation[\"Internal Implementation\"]");
    expect(flowchart).toContain("subgraph ExternalDependencies[\"Dependencies\"]");
    expect(flowchart).toContain("authenticateUser (function)");
    expect(flowchart).toContain("source/database");
  });

  it("generates valid Mermaid sequence diagram", () => {
    const sequence = generateModuleSequenceDiagram(
      sampleModule,
      sampleSymbols,
      sampleDependencies,
    );

    expect(sequence).toContain("sequenceDiagram");
    expect(sequence).toContain("autonumber");
    expect(sequence).toContain("actor Client as External Caller");
    expect(sequence).toContain("participant PublicAPI as authenticateUser");
    expect(sequence).toContain("participant InternalCore as verifyPasswordHash");
    expect(sequence).toContain("participant ExternalDep as source/database");
    expect(sequence).toContain("Client->>PublicAPI:");
  });

  it("combines flowchart and sequence diagram into single markdown document", () => {
    const markdown = generateModuleDiagramMarkdown(
      sampleModule,
      sampleSymbols,
      sampleDependencies,
      [sampleModule],
    );

    expect(markdown).toContain("# Module Architecture & Execution Diagrams: source/user_authentication");
    expect(markdown).toContain("## Architectural Flowchart");
    expect(markdown).toContain("```mermaid\nflowchart TD");
    expect(markdown).toContain("## Execution Sequence Diagram");
    expect(markdown).toContain("```mermaid\nsequenceDiagram");
  });

  it("writes diagram files to both docs/diagrams and .agents/diagrams", async () => {
    await generateAllModuleDiagramFiles({
      repositoryRootPath: "/test/project",
      detectedModules: [sampleModule],
      allExtractedSymbols: sampleSymbols,
      allExtractedDependencies: sampleDependencies,
    });

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(writeFile).mock.calls;
    const pathsWritten = calls.map((call) => String(call[0]));

    expect(pathsWritten.some((path) => path.includes("docs/diagrams/source_user_authentication.md") || path.includes("docs\\diagrams\\source_user_authentication.md"))).toBe(true);
    expect(pathsWritten.some((path) => path.includes(".agents/diagrams/source_user_authentication.md") || path.includes(".agents\\diagrams\\source_user_authentication.md"))).toBe(true);
  });
});
