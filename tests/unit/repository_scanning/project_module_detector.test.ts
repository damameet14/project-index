import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectProjectModules } from "../../../source/repository_scanning/project_module_detector.js";
import type { IgnorePatternResolver } from "../../../source/repository_scanning/ignore_pattern_resolver.js";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";

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

  it("limits discovery to multiple configured include directories", async () => {
    const mockIgnoreResolver = {
      shouldIgnorePath: () => false,
    } as unknown as IgnorePatternResolver;

    vi.mocked(existsSync).mockReturnValue(false);

    vi.mocked(readdir).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith("project-root")) {
        return Promise.resolve([
          { name: "src", isDirectory: () => true, isFile: () => false } as any,
          { name: "lib", isDirectory: () => true, isFile: () => false } as any,
          { name: "examples", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("src")) {
        return Promise.resolve([
          { name: "index.ts", isDirectory: () => false, isFile: () => true } as any,
          { name: "feature", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("src/feature")) {
        return Promise.resolve([
          { name: "worker.ts", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      if (normalized.endsWith("lib")) {
        return Promise.resolve([
          { name: "helper.py", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      if (normalized.endsWith("examples")) {
        return Promise.resolve([
          { name: "demo.ts", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      return Promise.resolve([]);
    });

    const { allDiscoveredFiles, detectedModules } = await detectProjectModules(
      "/project-root",
      mockIgnoreResolver,
      false,
      ["src/feature", "lib"],
    );

    expect(allDiscoveredFiles.map((file) => file.relativePath).sort()).toEqual([
      "lib/helper.py",
      "src/feature/worker.ts",
    ]);
    expect(detectedModules.map((module) => module.moduleName)).toContain("src");
    expect(detectedModules.map((module) => module.moduleName)).toContain("lib");
    expect(detectedModules.flatMap((module) => module.containedFilePaths)).not.toContain(
      "examples/demo.ts",
    );
  });

  it("detects Python packages with __init__.py, requirements.txt, and subpackages", async () => {
    const mockIgnoreResolver = {
      shouldIgnorePath: () => false,
    } as unknown as IgnorePatternResolver;

    vi.mocked(existsSync).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith("src/services/requirements.txt")) {
        return true;
      }
      return false;
    });

    vi.mocked(readdir).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith("python-root")) {
        return Promise.resolve([
          { name: "src", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("src")) {
        return Promise.resolve([
          { name: "pkg_a", isDirectory: () => true, isFile: () => false } as any,
          { name: "services", isDirectory: () => true, isFile: () => false } as any,
        ]);
      }
      if (normalized.endsWith("src/pkg_a")) {
        return Promise.resolve([
          { name: "__init__.py", isDirectory: () => false, isFile: () => true } as any,
          { name: "models.py", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      if (normalized.endsWith("src/services")) {
        return Promise.resolve([
          { name: "requirements.txt", isDirectory: () => false, isFile: () => true } as any,
          { name: "api.py", isDirectory: () => false, isFile: () => true } as any,
        ]);
      }
      return Promise.resolve([]);
    });

    const { detectedModules } = await detectProjectModules(
      "/python-root",
      mockIgnoreResolver,
      false,
    );

    const moduleNames = detectedModules.map((m) => m.moduleName);
    expect(moduleNames).toContain("src");
    expect(moduleNames).toContain("src/pkg_a");
    expect(moduleNames).toContain("src/services");

    const pkgAModule = detectedModules.find((m) => m.moduleName === "src/pkg_a");
    expect(pkgAModule?.entryPointFilePath).toBe("src/pkg_a/__init__.py");
    expect(pkgAModule?.containedFilePaths).toContain("src/pkg_a/models.py");
  });
});
