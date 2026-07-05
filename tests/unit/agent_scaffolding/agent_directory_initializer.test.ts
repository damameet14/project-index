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
      if (normalized.endsWith(".claude")) {
        return false;
      }
      return false;
    });

    await initializeAgentDirectory("/test-project");

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
    expect(cp).toHaveBeenCalled();
  });

  it("skips .agents/ scaffolding if .agents/ directory already exists, but still creates .claude/ if needed", async () => {
    vi.mocked(existsSync).mockImplementation((path: any) => {
      const normalized = String(path).replace(/\\/g, "/");
      if (normalized.endsWith(".agents")) {
        return true;
      }
      if (normalized.endsWith(".claude")) {
        return false;
      }
      return false;
    });

    await initializeAgentDirectory("/test-project");

    // .agents/ should not be touched
    const mkdirCalls = vi.mocked(mkdir).mock.calls;
    const agentsMkdirCalls = mkdirCalls.filter((call) =>
      String(call[0]).includes(".agents")
    );
    expect(agentsMkdirCalls.length).toBe(0);

    const writeFileCalls = vi.mocked(writeFile).mock.calls;
    const agentsWriteCalls = writeFileCalls.filter((call) =>
      String(call[0]).includes(".agents")
    );
    expect(agentsWriteCalls.length).toBe(0);

    // But .claude/ should be created
    const claudeMkdirCalls = mkdirCalls.filter((call) =>
      String(call[0]).includes(".claude")
    );
    expect(claudeMkdirCalls.length).toBeGreaterThan(0);

    const claudeWriteCalls = writeFileCalls.filter((call) =>
      String(call[0]).includes(".claude")
    );
    expect(claudeWriteCalls.length).toBe(2);
  });
});
