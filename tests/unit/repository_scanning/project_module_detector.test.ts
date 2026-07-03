import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectProjectModules } from "../../../source/repository_scanning/project_module_detector.js";
import type { IgnorePatternResolver } from "../../../source/repository_scanning/ignore_pattern_resolver.js";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn().mockResolvedValue(""),
  };
});

describe("Project Module Detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects sub-modules based on entry point files and MODULE.md", async () => {
    const mockIgnoreResolver = {
      shouldIgnorePath: () => false,
    } as unknown as IgnorePatternResolver;

    // We mock existsSync to simulate presence of MODULE.md
    vi.mocked(existsSync).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith("source/command_line_interface/MODULE.md")) {
        return true;
      }
      return false;
    });

    // Mock readdir and stat to simulate recursive discovery of files:
    // Root contains: source/, tests/
    // source/ contains: index.ts, command_line_interface/, repository_scanning/
    // tests/ contains: unit/
    // tests/unit/ contains: repository_scanning/
    // tests/unit/repository_scanning/ contains: project_module_detector.test.ts
    // source/command_line_interface/ contains: command_line_program.ts (and MODULE.md)
    // source/repository_scanning/ contains: index.ts, ignore_pattern_resolver.ts
    
    vi.mocked(readdir).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith("project-root")) {
        return Promise.resolve([
          { name: "source", isDirectory: () => true, isFile: () => false } as any,
          { name: "tests", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("source")) {
        return Promise.resolve([
          { name: "index.ts", isDirectory: () => false, isFile: () => true } as any,
          { name: "command_line_interface", isDirectory: () => true, isFile: () => false } as any,
          { name: "repository_scanning", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("command_line_interface")) {
        return Promise.resolve([
          { name: "command_line_program.ts", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      if (normalized.endsWith("source/repository_scanning")) {
        return Promise.resolve([
          { name: "index.ts", isDirectory: () => false, isFile: () => true } as any,
          { name: "ignore_pattern_resolver.ts", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      if (normalized.endsWith("tests")) {
        return Promise.resolve([
          { name: "unit", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("tests/unit")) {
        return Promise.resolve([
          { name: "repository_scanning", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("tests/unit/repository_scanning")) {
        return Promise.resolve([
          { name: "project_module_detector.test.ts", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(stat).mockImplementation((path: any) => {
      return Promise.resolve({
        isDirectory: () => !String(path).endsWith(".ts"),
      } as any);
    });

    const { detectedModules } = await detectProjectModules(
      "/project-root",
      mockIgnoreResolver,
      false, // monorepo detection disabled
    );

    // Expected modules:
    // 1. root (.)
    // 2. source (top-level)
    // 3. source/command_line_interface (contains MODULE.md)
    // 4. source/repository_scanning (contains index.ts)
    // 5. tests (top-level)

    const moduleNames = detectedModules.map((m) => m.moduleName);
    expect(moduleNames).toContain("root");
    expect(moduleNames).toContain("source");
    expect(moduleNames).toContain("source/command_line_interface");
    expect(moduleNames).toContain("source/repository_scanning");
    expect(moduleNames).toContain("tests");

    // Let's verify hierarchy:
    const cliModule = detectedModules.find((m) => m.moduleName === "source/command_line_interface");
    expect(cliModule?.parentModuleName).toBe("source");

    const sourceModule = detectedModules.find((m) => m.moduleName === "source");
    expect(sourceModule?.subModuleNames).toContain("source/command_line_interface");
    expect(sourceModule?.subModuleNames).toContain("source/repository_scanning");
    expect(sourceModule?.parentModuleName).toBe("root");
  });
});
