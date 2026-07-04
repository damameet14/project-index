import { describe, it, expect, vi, beforeEach } from "vitest";
import { createIgnorePatternResolver } from "../../../source/repository_scanning/ignore_pattern_resolver.js";
import { readFile } from "node:fs/promises";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

describe("Ignore Pattern Resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles empty paths and root directory without throwing error", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    const resolver = await createIgnorePatternResolver("/project-root", []);

    expect(resolver.shouldIgnorePath("")).toBe(false);
    expect(resolver.shouldIgnorePath(".")).toBe(false);
    expect(resolver.shouldIgnorePath("   ")).toBe(false);
    expect(resolver.shouldIgnorePath("./")).toBe(false);
  });

  it("ignores hardcoded default patterns", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    const resolver = await createIgnorePatternResolver("/project-root", []);

    expect(resolver.shouldIgnorePath("node_modules/express/index.js")).toBe(true);
    expect(resolver.shouldIgnorePath("dist/bundle.js")).toBe(true);
    expect(resolver.shouldIgnorePath(".venv/bin/python")).toBe(true);
    expect(resolver.shouldIgnorePath("source/index.ts")).toBe(false);
  });

  it("combines .gitignore patterns and user additional ignore patterns", async () => {
    vi.mocked(readFile).mockResolvedValue("*.log\ntemp/\n");

    const resolver = await createIgnorePatternResolver("/project-root", ["custom_build/"]);

    expect(resolver.shouldIgnorePath("app.log")).toBe(true);
    expect(resolver.shouldIgnorePath("temp/cache.txt")).toBe(true);
    expect(resolver.shouldIgnorePath("custom_build/output.json")).toBe(true);
    expect(resolver.shouldIgnorePath("source/app.ts")).toBe(false);
  });
});
