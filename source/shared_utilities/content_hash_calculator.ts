/**
 * Content hash calculator.
 *
 * Generates deterministic SHA-256 hashes of file contents
 * for incremental change detection.
 */

import { createHash } from "node:crypto";

/**
 * Calculate a SHA-256 hash of the given content string.
 * Returns a hex-encoded hash prefixed with "sha256:".
 */
export function calculateContentHash(content: string): string {
  const hash = createHash("sha256").update(content, "utf-8").digest("hex");
  return `sha256:${hash}`;
}

/**
 * Calculate a SHA-256 hash of a configuration object.
 * The object is JSON-serialized with sorted keys for determinism.
 */
export function calculateObjectHash(targetObject: Record<string, unknown>): string {
  const serialized = JSON.stringify(targetObject, Object.keys(targetObject).sort());
  return calculateContentHash(serialized);
}
