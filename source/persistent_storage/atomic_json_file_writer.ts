/**
 * Atomic JSON file writer.
 *
 * Writes JSON output files atomically by first writing to a temporary
 * file and then renaming, preventing corruption on crashes.
 */

import { writeFile, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { logDebug } from "../shared_utilities/index.js";

/**
 * Write a JavaScript object as pretty-printed JSON to a file atomically.
 *
 * The file is first written to a .tmp file in the same directory,
 * then renamed to the target path. This prevents partial writes on crashes.
 */
export async function writeJSONFileAtomically(
  targetFilePath: string,
  data: unknown,
  prettyPrint: boolean = true,
): Promise<void> {
  const directoryPath = dirname(targetFilePath);
  await mkdir(directoryPath, { recursive: true });

  const temporaryFilePath = `${targetFilePath}.tmp`;
  const jsonContent = prettyPrint
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);

  await writeFile(temporaryFilePath, jsonContent, "utf-8");
  await rename(temporaryFilePath, targetFilePath);

  logDebug(`Wrote ${jsonContent.length} bytes to ${targetFilePath}`);
}

/**
 * Write multiple JSON files atomically.
 */
export async function writeMultipleJSONFiles(
  outputDirectoryPath: string,
  fileEntries: Array<{ fileName: string; data: unknown }>,
): Promise<void> {
  await mkdir(outputDirectoryPath, { recursive: true });

  const writePromises = fileEntries.map((entry) =>
    writeJSONFileAtomically(
      join(outputDirectoryPath, entry.fileName),
      entry.data,
    ),
  );

  await Promise.all(writePromises);
}
