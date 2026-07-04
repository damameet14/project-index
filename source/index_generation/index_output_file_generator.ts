/**
 * Index output file generator.
 *
 * Transforms collected scan results into structured JSON output files
 * and a SQLite database, then writes them to the output directory.
 */

import { join, dirname } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import type { ExtractedSymbol } from "../contracts/index.js";
import type { DetectedModule } from "../contracts/index.js";
import type { ExtractedClass } from "../contracts/index.js";
import type { ExtractedFunction } from "../contracts/index.js";
import type { DependencyGraph, CircularDependencyChain, ModuleDependencyEdge, ExtractedFileDependency } from "../contracts/index.js";
import type { ProjectContext, ProjectContextModuleSummary, ProjectContextDirectoryDescription } from "../contracts/index.js";
import type { ScanStatistics } from "../contracts/index.js";
import type { ScanMetadata } from "../contracts/index.js";
import { writeMultipleJSONFiles, writeJSONFileAtomically } from "../persistent_storage/index.js";
import { writeSQLiteDatabaseFile } from "../persistent_storage/index.js";
import { extractDirectoryPath } from "../shared_utilities/index.js";
import { logInformation } from "../shared_utilities/index.js";
import { generateSymbolRegistryMarkdown } from "./symbol_registry_generator.js";
import { generateAllModuleDiagramFiles } from "../diagram_generation/index.js";

const SCHEMA_VERSION = "1.0.0";

export interface IndexGenerationInput {
  repositoryRootPath: string;
  outputDirectoryPath: string;
  projectName: string;
  detectedModules: DetectedModule[];
  allExtractedSymbols: ExtractedSymbol[];
  allExtractedClasses: ExtractedClass[];
  allExtractedFunctions: ExtractedFunction[];
  allExtractedDependencies: ExtractedFileDependency[];
  scanDurationMilliseconds: number;
  fileContentHashes: Record<string, string>;
  configurationHash: string;
}

/**
 * Generate all output index files from the scan results.
 */
export async function generateAllIndexOutputFiles(
  input: IndexGenerationInput,
): Promise<void> {
  const {
    outputDirectoryPath,
    detectedModules,
    allExtractedSymbols,
    allExtractedClasses,
    allExtractedFunctions,
    allExtractedDependencies,
    scanDurationMilliseconds,
    fileContentHashes,
  } = input;

  const generatedTimestamp = new Date().toISOString();

  // Build dependency graph with circular detection
  const dependencyGraph = buildModuleDependencyGraphFromFileDependencies(
    allExtractedDependencies,
    detectedModules,
  );

  // Enrich modules with dependency info
  const enrichedModules = enrichModulesWithDependencies(
    detectedModules,
    dependencyGraph,
    allExtractedSymbols,
  );

  // Generate context.json
  const projectContext = buildProjectContextSummaryFromScanResults(
    input,
    enrichedModules,
    allExtractedSymbols,
    allExtractedClasses,
    allExtractedFunctions,
    generatedTimestamp,
  );

  // Generate statistics.json
  const scanStatistics = buildScanStatisticsSummaryFromExtractedData(
    allExtractedSymbols,
    allExtractedClasses,
    allExtractedFunctions,
    enrichedModules,
    scanDurationMilliseconds,
    generatedTimestamp,
  );

  // Generate metadata.json
  const scanMetadata: ScanMetadata = {
    schemaVersion: SCHEMA_VERSION,
    toolVersion: "1.0.0",
    generatedAtTimestamp: generatedTimestamp,
    scanDurationMilliseconds,
    configurationHash: input.configurationHash,
    fileContentHashes,
    repositoryRootPath: input.repositoryRootPath,
  };

  // Write all JSON files
  await writeMultipleJSONFiles(outputDirectoryPath, [
    { fileName: "context.json", data: projectContext },
    { fileName: "modules.json", data: { modules: enrichedModules } },
    { fileName: "symbols.json", data: { symbols: allExtractedSymbols } },
    { fileName: "classes.json", data: { classes: allExtractedClasses } },
    { fileName: "functions.json", data: { functions: allExtractedFunctions } },
    { fileName: "dependencies.json", data: dependencyGraph },
    { fileName: "statistics.json", data: scanStatistics },
    { fileName: "routes.json", data: { routes: [] } }, // Deferred to v1.5
    { fileName: "metadata.json", data: scanMetadata },
  ]);

  // Write SQLite database
  try {
    await writeSQLiteDatabaseFile(
      join(outputDirectoryPath, "symbols.sqlite"),
      allExtractedSymbols,
      allExtractedClasses,
      allExtractedFunctions,
    );
  } catch (error) {
    logInformation(
      `SQLite database generation skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Generate and write symbol registry
  try {
    const registryMarkdown = generateSymbolRegistryMarkdown(
      enrichedModules,
      allExtractedSymbols,
    );
    const registryPath = join(
      input.repositoryRootPath,
      ".agents",
      "context",
      "function_registry.md",
    );
    await mkdir(dirname(registryPath), { recursive: true });
    await writeFile(registryPath, registryMarkdown, "utf-8");
  } catch (error) {
    logInformation(
      `Symbol registry generation skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Generate and write module flowchart & sequence diagrams
  try {
    await generateAllModuleDiagramFiles({
      repositoryRootPath: input.repositoryRootPath,
      detectedModules: enrichedModules,
      allExtractedSymbols,
      allExtractedDependencies,
    });
  } catch (error) {
    logInformation(
      `Module diagram generation skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logInformation(
    `Index generated: ${allExtractedSymbols.length} symbols, ` +
    `${allExtractedClasses.length} classes, ` +
    `${allExtractedFunctions.length} functions in ${enrichedModules.length} modules`,
  );
}

// ── Context builder ─────────────────────────────────────────────────

function buildProjectContextSummaryFromScanResults(
  input: IndexGenerationInput,
  modules: DetectedModule[],
  symbols: ExtractedSymbol[],
  classes: ExtractedClass[],
  functions: ExtractedFunction[],
  timestamp: string,
): ProjectContext {
  const languages = [...new Set(symbols.map((symbol) => symbol.language))];
  const entryPoints = modules
    .filter((module) => module.entryPointFilePath !== null)
    .map((module) => module.entryPointFilePath!);

  const moduleSummaries: ProjectContextModuleSummary[] = modules.map(
    (module) => ({
      moduleName: module.moduleName,
      purpose: module.purpose || `Module at ${module.locationPath}`,
      locationPath: module.locationPath,
      publicSymbolNames: module.publicInterfaceSymbolIdentifiers.map(
        (identifier) => identifier.split("::").pop() ?? identifier,
      ),
    }),
  );

  // Build directory descriptions
  const directoryPaths = new Set<string>();
  for (const symbol of symbols) {
    const directoryPath = extractDirectoryPath(symbol.filePath);
    if (directoryPath) {
      directoryPaths.add(directoryPath);
    }
  }

  const directoryDescriptions: ProjectContextDirectoryDescription[] = [
    ...directoryPaths,
  ]
    .sort()
    .map((directoryPath) => ({
      directoryPath,
      description: inferDirectoryDescriptionFromModuleMetadata(directoryPath, modules),
    }));

  return {
    version: SCHEMA_VERSION,
    generatedAtTimestamp: timestamp,
    project: {
      projectName: input.projectName,
      description: `Repository containing ${modules.length} modules across ${languages.join(", ")}`,
      repositoryRootPath: input.repositoryRootPath,
    },
    summary: {
      totalFileCount: new Set(symbols.map((s) => s.filePath)).size,
      totalSymbolCount: symbols.length,
      totalClassCount: classes.length,
      totalFunctionCount: functions.length,
      detectedLanguages: languages,
      detectedFrameworks: detectFrameworksFromModuleTechnologies(modules),
      identifiedEntryPoints: entryPoints,
    },
    modules: moduleSummaries,
    conventions: {
      sourceRootPath: inferSourceRootDirectoryFromSymbolPaths(symbols),
      testFilePattern: inferTestFileGlobPatternFromSymbolPaths(symbols),
      configurationFiles: [],
    },
    directoryDescriptions,
  };
}

// ── Statistics builder ──────────────────────────────────────────────

function buildScanStatisticsSummaryFromExtractedData(
  symbols: ExtractedSymbol[],
  classes: ExtractedClass[],
  functions: ExtractedFunction[],
  modules: DetectedModule[],
  scanDurationMilliseconds: number,
  timestamp: string,
): ScanStatistics {
  const fileCountByLanguage: Record<string, number> = {};
  const lineCountByLanguage: Record<string, number> = {};
  const filePaths = new Set<string>();

  for (const symbol of symbols) {
    filePaths.add(symbol.filePath);
    fileCountByLanguage[symbol.language] =
      (fileCountByLanguage[symbol.language] ?? 0) + 1;
  }

  // Deduplicate file counts
  const uniqueFilesByLanguage: Record<string, Set<string>> = {};
  for (const symbol of symbols) {
    if (!uniqueFilesByLanguage[symbol.language]) {
      uniqueFilesByLanguage[symbol.language] = new Set();
    }
    uniqueFilesByLanguage[symbol.language].add(symbol.filePath);
  }

  const correctedFileCountByLanguage: Record<string, number> = {};
  for (const [language, files] of Object.entries(uniqueFilesByLanguage)) {
    correctedFileCountByLanguage[language] = files.size;
  }

  return {
    totalFileCount: filePaths.size,
    fileCountByLanguage: correctedFileCountByLanguage,
    totalLineCount: 0, // Would need file reading for accurate count
    lineCountByLanguage: lineCountByLanguage,
    moduleCount: modules.length,
    classCount: classes.length,
    functionCount: functions.length,
    symbolCount: symbols.length,
    routeCount: 0,
    averageFilesPerModule:
      modules.length > 0 ? Math.round(filePaths.size / modules.length) : 0,
    averageFunctionsPerFile:
      filePaths.size > 0 ? Math.round(functions.length / filePaths.size) : 0,
    scanDurationMilliseconds,
    generatedAtTimestamp: timestamp,
  };
}

// ── Dependency graph builder ────────────────────────────────────────

export function buildModuleDependencyGraphFromFileDependencies(
  fileDependencies: ExtractedFileDependency[],
  modules: DetectedModule[],
): DependencyGraph {
  const moduleDependencies = buildModuleDependencyEdgesFromFileDependencies(fileDependencies, modules);
  const circularDependencies = detectCircularModuleDependencies(moduleDependencies);

  return {
    fileDependencies,
    moduleDependencies,
    circularDependencies,
  };
}

function buildModuleDependencyEdgesFromFileDependencies(
  fileDependencies: ExtractedFileDependency[],
  modules: DetectedModule[],
): ModuleDependencyEdge[] {
  const edges = new Map<string, ModuleDependencyEdge>();

  for (const dependency of fileDependencies) {
    if (dependency.classification !== "internal" || dependency.resolvedTargetFilePath === null) {
      continue;
    }

    const sourceModule = findContainingModuleNameForFilePath(dependency.sourceFilePath, modules);
    const targetModule = findContainingModuleNameForFilePath(
      dependency.resolvedTargetFilePath,
      modules,
    );

    if (
      sourceModule === null ||
      targetModule === null ||
      sourceModule === targetModule
    ) {
      continue;
    }

    const edgeKey = `${sourceModule}→${targetModule}`;
    const existingEdge = edges.get(edgeKey);

    if (existingEdge) {
      existingEdge.fileDependencyPaths.push({
        sourceFilePath: dependency.sourceFilePath,
        targetFilePath: dependency.resolvedTargetFilePath,
      });
    } else {
      edges.set(edgeKey, {
        sourceModuleName: sourceModule,
        targetModuleName: targetModule,
        fileDependencyPaths: [
          {
            sourceFilePath: dependency.sourceFilePath,
            targetFilePath: dependency.resolvedTargetFilePath,
          },
        ],
      });
    }
  }

  return [...edges.values()];
}

function findContainingModuleNameForFilePath(
  filePath: string,
  modules: DetectedModule[],
): string | null {
  for (const module of modules) {
    if (module.containedFilePaths.includes(filePath)) {
      return module.moduleName;
    }
  }
  return null;
}

function detectCircularModuleDependencies(
  edges: ModuleDependencyEdge[],
): CircularDependencyChain[] {
  const adjacencyList = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!adjacencyList.has(edge.sourceModuleName)) {
      adjacencyList.set(edge.sourceModuleName, new Set());
    }
    adjacencyList.get(edge.sourceModuleName)!.add(edge.targetModuleName);
  }

  const cycles: CircularDependencyChain[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function searchForCircularDependenciesUsingDepthFirst(
    currentNode: string,
    path: string[],
  ): void {
    visited.add(currentNode);
    recursionStack.add(currentNode);
    path.push(currentNode);

    const neighbors = adjacencyList.get(currentNode) ?? new Set();
    for (const neighbor of neighbors) {
      if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStartIndex = path.indexOf(neighbor);
        const cycleNodes = path.slice(cycleStartIndex);
        cycleNodes.push(neighbor);
        cycles.push({
          moduleNamesInCycle: cycleNodes,
          description: `Circular dependency: ${cycleNodes.join(" → ")}`,
        });
      } else if (!visited.has(neighbor)) {
        searchForCircularDependenciesUsingDepthFirst(neighbor, path);
      }
    }

    path.pop();
    recursionStack.delete(currentNode);
  }

  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      searchForCircularDependenciesUsingDepthFirst(node, []);
    }
  }

  return cycles;
}

// ── Module enrichment ───────────────────────────────────────────────

function enrichModulesWithDependencies(
  modules: DetectedModule[],
  dependencyGraph: DependencyGraph,
  symbols: ExtractedSymbol[],
): DetectedModule[] {
  return modules.map((module) => {
    const dependencyModuleNames = dependencyGraph.moduleDependencies
      .filter((edge) => edge.sourceModuleName === module.moduleName)
      .map((edge) => edge.targetModuleName);

    const dependentModuleNames = dependencyGraph.moduleDependencies
      .filter((edge) => edge.targetModuleName === module.moduleName)
      .map((edge) => edge.sourceModuleName);

    const publicSymbolIdentifiers = symbols
      .filter(
        (symbol) =>
          symbol.moduleName === module.moduleName && symbol.isExported,
      )
      .map((symbol) => symbol.symbolIdentifier);

    return {
      ...module,
      dependencyModuleNames: [...new Set(dependencyModuleNames)],
      dependentModuleNames: [...new Set(dependentModuleNames)],
      publicInterfaceSymbolIdentifiers: publicSymbolIdentifiers,
    };
  });
}

// ── Inference helpers ───────────────────────────────────────────────

function inferSourceRootDirectoryFromSymbolPaths(symbols: ExtractedSymbol[]): string | null {
  const topLevelDirectories = new Set<string>();
  for (const symbol of symbols) {
    const parts = symbol.filePath.split("/");
    if (parts.length > 1) {
      topLevelDirectories.add(parts[0]);
    }
  }

  const commonRoots = ["src", "source", "lib", "app"];
  for (const root of commonRoots) {
    if (topLevelDirectories.has(root)) {
      return root;
    }
  }

  return null;
}

function inferTestFileGlobPatternFromSymbolPaths(symbols: ExtractedSymbol[]): string | null {
  const testFiles = symbols.filter(
    (symbol) =>
      symbol.filePath.includes(".test.") ||
      symbol.filePath.includes(".spec.") ||
      symbol.filePath.includes("test_") ||
      symbol.filePath.includes("/tests/"),
  );

  if (testFiles.some((file) => file.filePath.includes(".test."))) {
    return "**/*.test.{ts,tsx,js,jsx}";
  }
  if (testFiles.some((file) => file.filePath.includes(".spec."))) {
    return "**/*.spec.{ts,tsx,js,jsx}";
  }
  if (testFiles.some((file) => file.filePath.includes("test_"))) {
    return "**/test_*.py";
  }

  return null;
}

function inferDirectoryDescriptionFromModuleMetadata(
  directoryPath: string,
  modules: DetectedModule[],
): string {
  const matchingModule = modules.find(
    (module) => module.locationPath === directoryPath,
  );
  if (matchingModule) {
    return matchingModule.purpose || `Module: ${matchingModule.moduleName}`;
  }

  const directoryName = directoryPath.split("/").pop() ?? directoryPath;
  return `${directoryName} directory`;
}

function detectFrameworksFromModuleTechnologies(modules: DetectedModule[]): string[] {
  const frameworks = new Set<string>();
  for (const module of modules) {
    for (const technology of module.detectedTechnologies) {
      frameworks.add(technology);
    }
  }
  return [...frameworks];
}
