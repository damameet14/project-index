import { describe, it, expect, vi, beforeEach } from "vitest";
import { initializeAgentDirectory } from "../../../source/agent_scaffolding/agent_directory_initializer.js";
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp } from "node:fs/promises";

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
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    cp: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Agent Directory Initializer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scaffolds .agents/ folder correctly if it does not exist", async () => {
    // existsSync returns false for .agents directory, but true for skill source bundle
    vi.mocked(existsSync).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith(".agents")) {
        return false;
      }
      if (normalized.includes("skills/ai-navigable-modular-coding")) {
        return true;
      }
      return false;
    });

    await initializeAgentDirectory("/test-project");

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
    expect(cp).toHaveBeenCalled();
  });

  it("skips scaffolding if .agents/ directory already exists", async () => {
    vi.mocked(existsSync).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith(".agents")) {
        return true;
      }
      return false;
    });

    await initializeAgentDirectory("/test-project");

    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(cp).not.toHaveBeenCalled();
  });
});
