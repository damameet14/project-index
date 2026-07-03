/**
 * Programming language detector.
 *
 * Maps file extensions to supported programming languages.
 * Returns null for unsupported file types.
 */

export type SupportedLanguage = "typescript" | "python" | "javascript";

const FILE_EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".pyi": "python",
};

/**
 * Detect the programming language of a file based on its extension.
 * Returns null if the file extension is not recognized as a supported language.
 */
export function detectLanguageFromFilePath(
  filePath: string,
): SupportedLanguage | null {
  const lowerCasePath = filePath.toLowerCase();

  for (const [extension, language] of Object.entries(FILE_EXTENSION_TO_LANGUAGE)) {
    if (lowerCasePath.endsWith(extension)) {
      return language;
    }
  }

  return null;
}

/**
 * Get all file extensions associated with a given language.
 */
export function getFileExtensionsForLanguage(
  language: SupportedLanguage,
): string[] {
  return Object.entries(FILE_EXTENSION_TO_LANGUAGE)
    .filter(([, detectedLanguage]) => detectedLanguage === language)
    .map(([extension]) => extension);
}

/**
 * Check whether a file path has a supported language extension.
 */
export function isFilePathSupportedLanguage(filePath: string): boolean {
  return detectLanguageFromFilePath(filePath) !== null;
}
