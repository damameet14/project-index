/**
 * Ignore pattern resolver.
 *
 * Combines .gitignore rules, hardcoded defaults, and user-provided
 * ignore patterns into a single predicate that determines whether
 * a given file path should be excluded from scanning.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ignore, { type Ignore } from "ignore";
import { logDebug } from "../shared_utilities/index.js";

/**
 * Directories and patterns that should always be excluded from scanning,
 * regardless of .gitignore or user configuration.
 */
const HARDCODED_IGNORE_PATTERNS: string[] = [
  "node_modules",
  "__pycache__",
  ".venv",
  "venv",
  ".env",
  "dist",
  "build",
  "out",
  ".git",
  ".hg",
  ".svn",
  ".project-index",
  ".next",
  ".nuxt",
  ".cache",
  ".parcel-cache",
  "coverage",
  ".nyc_output",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "*.egg-info",
  ".eggs",
  "target",
  "bin",
  "obj",
  ".idea",
  ".vscode",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
];

export interface IgnorePatternResolver {
  /**
   * Returns true if the given relative path should be ignored.
   */
  shouldIgnorePath(relativePath: string): boolean;
}

/**
 * Create an ignore pattern resolver by loading .gitignore from the
 * repository root, combining with hardcoded defaults and user patterns.
 */
export async function createIgnorePatternResolver(
  repositoryRootPath: string,
  additionalIgnorePatterns: string[],
): Promise<IgnorePatternResolver> {
  const ignoreFunction = typeof ignore === "function" ? ignore : (ignore as any).default;
  const ignoreInstance: Ignore = ignoreFunction();

  // 1. Add hardcoded defaults
  ignoreInstance.add(HARDCODED_IGNORE_PATTERNS);

  // 2. Try to load .gitignore
  const gitignorePath = join(repositoryRootPath, ".gitignore");
  try {
    const gitignoreContent = await readFile(gitignorePath, "utf-8");
    ignoreInstance.add(gitignoreContent);
    logDebug(`Loaded .gitignore from: ${gitignorePath}`);
  } catch {
    logDebug("No .gitignore found, using defaults only.");
  }

  // 3. Add user-provided patterns
  if (additionalIgnorePatterns.length > 0) {
    ignoreInstance.add(additionalIgnorePatterns);
    logDebug(
      `Added ${additionalIgnorePatterns.length} additional ignore patterns.`,
    );
  }

  return {
    shouldIgnorePath(relativePath: string): boolean {
      if (!relativePath || relativePath === "." || relativePath.trim() === "") {
        return false;
      }
      // The `ignore` library expects forward-slash paths without leading ./
      const normalizedPath = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
      if (!normalizedPath || normalizedPath === ".") {
        return false;
      }
      return ignoreInstance.ignores(normalizedPath);
    },
  };
}
