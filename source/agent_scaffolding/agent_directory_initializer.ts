/**
 * Agent directory initializer.
 *
 * Scaffolds the .agents/ directory structure, AGENTS.md instructions,
 * and copies the ai-navigable-modular-coding skill bundle.
 * Also creates the .claude/ directory for Claude Code configuration.
 */

import { mkdir, writeFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logSuccess, logWarning } from "../shared_utilities/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const AGENTS_INSTRUCTION_TEMPLATE = `# AI Agent Navigation Guide

## Mandatory workflow: before writing or modifying code

1. Read \`.agents/context/function_registry.md\` to identify which module and symbol owns the behavior you need to change.
2. Run \`project-index query "<symbol_name>"\` to get the exact file path, line number, and signature.
3. Open ONLY the returned file at the returned line number.
4. Do NOT browse directories or read files speculatively.
5. Do NOT read \`.project-index/\` JSON files directly.

## Mandatory workflow: after modifying code

1. Run \`project-index scan\` if watch mode is not running.
2. Verify that \`function_registry.md\` reflects your changes.

## Skills

For code creation, modification, refactoring, architecture, naming, module design, and code review, use the \`ai-navigable-modular-coding\` skill. Treat its naming, module-boundary, repository-navigation, contract, and change-safety requirements as mandatory.
`;

export const CLAUDE_INSTRUCTION_TEMPLATE = `# CLAUDE.md - Project Index Configuration for Claude Code

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory workflow: before writing or modifying code

1. Read \`.claude/context/function_registry.md\` to identify which module and symbol owns the behavior you need to change.
2. Run \`project-index query "<symbol_name>"\` to get the exact file path, line number, and signature.
3. Open ONLY the returned file at the returned line number.
4. Do NOT browse directories or read files speculatively.
5. Do NOT read \`.project-index/\` JSON files directly.

## Mandatory workflow: after modifying code

1. Run \`project-index scan\` if watch mode is not running.
2. Verify that \`function_registry.md\` reflects your changes.

## Skills

For code creation, modification, refactoring, architecture, naming, module design, and code review, use the \`ai-navigable-modular-coding\` skill. Treat its naming, module-boundary, repository-navigation, contract, and change-safety requirements as mandatory.
`;

export const CLAUDE_SETTINGS_TEMPLATE = `{
  "permissions": {
    "allow": [
      "Bash(npm run build)",
      "Bash(npm run test)",
      "Bash(npm run lint)",
      "Bash(npx vitest*)",
      "Bash(npx tsx*)",
      "Bash(project-index*)",
      "Bash(git*)",
      "Read(**)",
      "Glob(**)",
      "Grep(**)"
    ]
  }
}
`;

export interface InitializeAgentDirectoryOptions {
  initAgents?: boolean;
  initClaude?: boolean;
}

/**
 * Initialize the .agents/ directory and copy the skill bundle.
 * Can also initialize .claude/ directory for Claude Code.
 */
export async function initializeAgentDirectory(
  repositoryRootPath: string,
  options: InitializeAgentDirectoryOptions = { initAgents: true, initClaude: true },
): Promise<void> {
  const { initAgents = true, initClaude = true } = options;

  // Resolve skill source path (works for both bundled dist/ and source/)
  let skillSourcePath = join(
    __dirname,
    "..",
    "assets",
    "skills",
    "ai-navigable-modular-coding",
  );

  if (!existsSync(skillSourcePath)) {
    skillSourcePath = join(
      __dirname,
      "..",
      "..",
      "assets",
      "skills",
      "ai-navigable-modular-coding",
    );
  }

  // Initialize .agents/
  if (initAgents) {
    const agentsDirPath = join(repositoryRootPath, ".agents");

    if (existsSync(agentsDirPath)) {
      logWarning(".agents/ directory already exists at: " + agentsDirPath + ". Skipping scaffolding.");
    } else {
      // Create .agents/ and .agents/context/
      const contextDirPath = join(agentsDirPath, "context");
      await mkdir(contextDirPath, { recursive: true });
      logSuccess("Created directory: " + contextDirPath);

      // Create AGENTS.md
      const agentsMdPath = join(agentsDirPath, "AGENTS.md");
      await writeFile(agentsMdPath, AGENTS_INSTRUCTION_TEMPLATE, "utf-8");
      logSuccess("Created: " + agentsMdPath);

      // Copy skill bundle to .agents/skills/
      const skillDestPath = join(
        agentsDirPath,
        "skills",
        "ai-navigable-modular-coding",
      );

      if (existsSync(skillSourcePath)) {
        await mkdir(dirname(skillDestPath), { recursive: true });
        await cp(skillSourcePath, skillDestPath, { recursive: true });
        logSuccess("Copied modular coding skill to: " + skillDestPath);
      } else {
        logWarning("Warning: Could not find skill bundle source at " + skillSourcePath + ".");
      }
    }
  }

  // Initialize .claude/
  if (initClaude) {
    const claudeDirPath = join(repositoryRootPath, ".claude");

    if (existsSync(claudeDirPath)) {
      logWarning(".claude/ directory already exists at: " + claudeDirPath + ". Skipping scaffolding.");
    } else {
      // Create .claude/ subdirectories
      const subdirs = ["hooks", "agents", "commands", "scripts"];
      for (const subdir of subdirs) {
        await mkdir(join(claudeDirPath, subdir), { recursive: true });
        logSuccess("Created directory: .claude/" + subdir + "/");
      }

      // Create settings.json with default permissions for common development tasks
      const settingsPath = join(claudeDirPath, "settings.json");
      await writeFile(settingsPath, CLAUDE_SETTINGS_TEMPLATE, "utf-8");
      logSuccess("Created: " + settingsPath);

      // Create CLAUDE.md
      const claudeMdPath = join(claudeDirPath, "CLAUDE.md");
      await writeFile(claudeMdPath, CLAUDE_INSTRUCTION_TEMPLATE, "utf-8");
      logSuccess("Created: " + claudeMdPath);

      // Copy skill bundle to .claude/skills/
      const claudeSkillDestPath = join(
        claudeDirPath,
        "skills",
        "ai-navigable-modular-coding",
      );

      if (existsSync(skillSourcePath)) {
        await mkdir(dirname(claudeSkillDestPath), { recursive: true });
        await cp(skillSourcePath, claudeSkillDestPath, { recursive: true });
        logSuccess("Copied modular coding skill to: " + claudeSkillDestPath);
      } else {
        logWarning(
          "Warning: Could not find skill bundle source at " + skillSourcePath + ".",
        );
      }
    }
  }
}
