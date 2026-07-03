/**
 * Agent directory initializer.
 *
 * Scaffolds the .agents/ directory structure, AGENTS.md instructions,
 * and copies the ai-navigable-modular-coding skill bundle.
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

/**
 * Initialize the .agents/ directory and copy the skill bundle.
 */
export async function initializeAgentDirectory(
  repositoryRootPath: string,
): Promise<void> {
  const agentsDirPath = join(repositoryRootPath, ".agents");

  if (existsSync(agentsDirPath)) {
    logWarning(`.agents/ directory already exists at: ${agentsDirPath}. Skipping scaffolding.`);
    return;
  }

  // Create .agents/ and .agents/context/
  const contextDirPath = join(agentsDirPath, "context");
  await mkdir(contextDirPath, { recursive: true });
  logSuccess(`Created directory: ${contextDirPath}`);

  // Create AGENTS.md
  const agentsMdPath = join(agentsDirPath, "AGENTS.md");
  await writeFile(agentsMdPath, AGENTS_INSTRUCTION_TEMPLATE, "utf-8");
  logSuccess(`Created: ${agentsMdPath}`);

  // Copy skill bundle
  // Package root is 2 levels up from dist/agent_scaffolding/ or source/agent_scaffolding/
  const packageRoot = join(__dirname, "..", "..");
  const skillSourcePath = join(
    packageRoot,
    ".agents",
    "skills",
    "ai-navigable-modular-coding",
  );

  const skillDestPath = join(
    agentsDirPath,
    "skills",
    "ai-navigable-modular-coding",
  );

  if (existsSync(skillSourcePath)) {
    await mkdir(dirname(skillDestPath), { recursive: true });
    await cp(skillSourcePath, skillDestPath, { recursive: true });
    logSuccess(`Copied modular coding skill to: ${skillDestPath}`);
  } else {
    logWarning(`Warning: Could not find skill bundle source at ${skillSourcePath}.`);
  }
}
