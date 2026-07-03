import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadProjectIndexConfiguration } from "../../../source/configuration/configuration_loader.js";
import { DEFAULT_PROJECT_INDEX_CONFIGURATION } from "../../../source/configuration/configuration_schema.js";

describe("Configuration Loader", () => {
  it("loads default configuration when no config is found", async () => {
    // Pass a path that definitely has no config file
    const config = await loadProjectIndexConfiguration("/tmp/nonexistent-path-for-project-index-tests");
    
    expect(config).toEqual(DEFAULT_PROJECT_INDEX_CONFIGURATION);
  });

  it("merges user configuration with defaults", async () => {
    // In our own project root, we have .project-indexrc.json
    // Let's just test the loader on our own repo root
    const config = await loadProjectIndexConfiguration(process.cwd());
    
    expect(config.outputDirectoryName).toBe(DEFAULT_PROJECT_INDEX_CONFIGURATION.outputDirectoryName);
    expect(config.enabledLanguages).toEqual(DEFAULT_PROJECT_INDEX_CONFIGURATION.enabledLanguages);
    expect(config.isMonorepoDetectionEnabled).toBe(DEFAULT_PROJECT_INDEX_CONFIGURATION.isMonorepoDetectionEnabled);
  });

  it("accepts sourceDirectories as an alias for restrictToIncludePaths", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "project-index-config-"));
    await writeFile(
      join(temporaryDirectory, ".project-indexrc.json"),
      JSON.stringify({ sourceDirectories: ["src", "packages/api"] }),
      "utf-8",
    );

    const config = await loadProjectIndexConfiguration(temporaryDirectory);

    expect(config.restrictToIncludePaths).toEqual(["src", "packages/api"]);
  });
});
