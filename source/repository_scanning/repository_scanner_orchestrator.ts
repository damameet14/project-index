/**
 * Repository scanner orchestrator.
 *
 * The main entry point for scanning a repository. Coordinates
 * file discovery, language detection, module detection, parsing,
 * and index generation into a single pipeline.
 */

import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import type { ProjectIndexConfiguration } from "../configuration/index.js";
import type { ExtractedSymbol } from "../contracts/index.js";
import type { ExtractedClass } from "../contracts/index.js";
import type { ExtractedFunction } from "../contracts/index.js";
import type { ExtractedFileDependency } from "../contracts/index.js";
import { createIgnorePatternResolver } from "./ignore_pattern_resolver.js";
import { detectProjectModules } from "./project_module_detector.js";
import { detectLanguageFromFilePath } from "./programming_language_detector.js";
import {
  LanguageParserRegistry,
  TypeScriptSourceFileParser,
  PythonSourceFileParser,
} from "../symbol_extraction/index.js";
import { generateAllIndexOutputFiles } from "../index_generation/index.js";
import {
  calculateContentHash,
  calculateObjectHash,
} from "../shared_utilities/index.js";
import { startPerformanceTimer } from "../shared_utilities/index.js";
import {
  logInformation,
  logError,
  logWarning,
  logSuccess,
} from "../shared_utilities/index.js";

export interface RepositoryScanRequest {
  repositoryRootPath: string;
  configuration: ProjectIndexConfiguration;
}

/**
 * Execute a full repository scan.
 *
 * This is the primary entry point used by the CLI scan command.
 * It discovers files, parses them, and generates all output indexes.
 */
export async function executeRepositoryScan(
  request: RepositoryScanRequest,
): Promise<void> {
  const overallTimer = startPerformanceTimer("Full repository scan");

  const { repositoryRootPath, configuration } = request;
  const outputDirectoryPath = join(
    repositoryRootPath,
    configuration.outputDirectoryName,
  );

  logInformation(`Scanning repository: ${repositoryRootPath}`);

  // 1. Create ignore pattern resolver
  const ignoreResolver = await createIgnorePatternResolver(
    repositoryRootPath,
    configuration.additionalIgnorePatterns,
  );

  // 2. Detect modules and discover files
  const { detectedModules, allDiscoveredFiles } = await detectProjectModules(
    repositoryRootPath,
    ignoreResolver,
    configuration.isMonorepoDetectionEnabled,
    configuration.restrictToIncludePaths,
  );

  if (allDiscoveredFiles.length === 0) {
    logWarning("No source files found to scan.");
    return;
  }

  // 3. Set up parser registry
  const parserRegistry = new LanguageParserRegistry();

  if (configuration.enabledLanguages.includes("typescript")) {
    parserRegistry.registerParser(new TypeScriptSourceFileParser());
  }
  if (configuration.enabledLanguages.includes("javascript")) {
    parserRegistry.registerParser(new TypeScriptSourceFileParser("javascript", [".js", ".jsx", ".mjs", ".cjs"]));
  }
  if (configuration.enabledLanguages.includes("python")) {
    parserRegistry.registerParser(new PythonSourceFileParser());
  }

  // 4. Parse all files
  const allExtractedSymbols: ExtractedSymbol[] = [];
  const allExtractedClasses: ExtractedClass[] = [];
  const allExtractedFunctions: ExtractedFunction[] = [];
  const allExtractedDependencies: ExtractedFileDependency[] = [];
  const fileContentHashes: Record<string, string> = {};

  let parsedFileCount = 0;
  let failedFileCount = 0;

  for (const discoveredFile of allDiscoveredFiles) {
    try {
      const fileContent = await readFile(discoveredFile.absolutePath, "utf-8");
      const contentHash = calculateContentHash(fileContent);
      fileContentHashes[discoveredFile.relativePath] = contentHash;

      const language = detectLanguageFromFilePath(discoveredFile.relativePath);
      if (language === null) {
        continue;
      }

      const parser = await parserRegistry.getParserForLanguage(language);
      if (parser === null) {
        continue;
      }

      // Determine which module this file belongs to
      const moduleName = findModuleNameForFile(
        discoveredFile.relativePath,
        detectedModules,
      );

      const parseResult = await parser.parseSourceFile(
        discoveredFile.absolutePath,
        fileContent,
        moduleName,
        discoveredFile.relativePath,
      );

      allExtractedSymbols.push(...parseResult.extractedSymbols);
      allExtractedClasses.push(...parseResult.extractedClasses);
      allExtractedFunctions.push(...parseResult.extractedFunctions);
      allExtractedDependencies.push(...parseResult.extractedDependencies);

      parsedFileCount++;
    } catch (error) {
      failedFileCount++;
      logError(
        `Failed to parse ${discoveredFile.relativePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  logInformation(
    `Parsed ${parsedFileCount} files (${failedFileCount} failed).`,
  );

  // 5. Generate output indexes
  const measurement = overallTimer.stopAndGetMeasurement();
  const projectName = basename(repositoryRootPath);

  await generateAllIndexOutputFiles({
    repositoryRootPath,
    outputDirectoryPath,
    projectName,
    detectedModules,
    allExtractedSymbols,
    allExtractedClasses,
    allExtractedFunctions,
    allExtractedDependencies,
    scanDurationMilliseconds: measurement.durationMilliseconds,
    fileContentHashes,
    configurationHash: calculateObjectHash(
      configuration as unknown as Record<string, unknown>,
    ),
  });

  // 6. Cleanup
  parserRegistry.disposeAllParsers();

  logSuccess(
    `Repository scan complete in ${measurement.durationMilliseconds.toFixed(0)}ms. ` +
    `Output written to ${outputDirectoryPath}`,
  );
}

function findModuleNameForFile(
  relativeFilePath: string,
  modules: Array<{ moduleName: string; containedFilePaths: string[] }>,
): string {
  for (const module of modules) {
    if (module.containedFilePaths.includes(relativeFilePath)) {
      return module.moduleName;
    }
  }
  return "root";
}
