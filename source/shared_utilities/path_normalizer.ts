/**
 * Cross-platform path normalizer.
 *
 * Ensures all paths in generated output use forward slashes
 * and are relative to the repository root.
 */

import { relative, resolve, sep } from "node:path";

/**
 * Normalize a file path to use forward slashes consistently.
 */
export function normalizeToForwardSlashes(filePath: string): string {
  return filePath.split(sep).join("/");
}

/**
 * Convert an absolute path to a repository-relative path with forward slashes.
 */
export function convertToRelativePath(
  absoluteFilePath: string,
  repositoryRootPath: string,
): string {
  const relativePath = relative(repositoryRootPath, absoluteFilePath);
  return normalizeToForwardSlashes(relativePath);
}

/**
 * Resolve a relative path against the repository root to an absolute path.
 */
export function resolveAbsolutePath(
  relativeFilePath: string,
  repositoryRootPath: string,
): string {
  return resolve(repositoryRootPath, relativeFilePath);
}

/**
 * Extract the directory portion of a path (forward slashes).
 */
export function extractDirectoryPath(filePath: string): string {
  const normalized = normalizeToForwardSlashes(filePath);
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return "";
  }
  return normalized.slice(0, lastSlashIndex);
}

/**
 * Extract the file name from a path.
 */
export function extractFileName(filePath: string): string {
  const normalized = normalizeToForwardSlashes(filePath);
  const lastSlashIndex = normalized.lastIndexOf("/");
  return normalized.slice(lastSlashIndex + 1);
}
