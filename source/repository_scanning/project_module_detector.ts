/**
 * Project module detector.
 *
 * Scans the repository to identify logical modules (packages, feature
 * directories, monorepo sub-projects). Groups files into modules
 * based on project manifests and directory structure.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import type { DetectedModule } from "../contracts/index.js";
import type { IgnorePatternResolver } from "./ignore_pattern_resolver.js";
import { convertToRelativePath } from "../shared_utilities/index.js";
import { logDebug, logInformation } from "../shared_utilities/index.js";
import { isFilePathSupportedLanguage, detectLanguageFromFilePath } from "./programming_language_detector.js";

/**
 * Files whose presence indicates a project or sub-project root.
 */
const PROJECT_MANIFEST_FILE_NAMES = [
  "package.json",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
];

/**
 * Files whose presence indicates a Python package.
 */
const PYTHON_PACKAGE_INDICATOR_FILE_NAMES = ["__init__.py"];

/**
 * Common entry point file names for automatic detection.
 */
const ENTRY_POINT_FILE_NAME_CANDIDATES = [
  "index.ts",
  "index.tsx",
  "main.ts",
  "app.ts",
  "server.ts",
  "__main__.py",
  "main.py",
  "app.py",
  "manage.py",
];

interface DiscoveredFileEntry {
  absolutePath: string;
  relativePath: string;
  language: string;
}

/**
 * Detect all logical modules within a repository.
 */
export async function detectProjectModules(
  repositoryRootPath: string,
  ignoreResolver: IgnorePatternResolver,
  isMonorepoDetectionEnabled: boolean,
): Promise<{
  detectedModules: DetectedModule[];
  allDiscoveredFiles: DiscoveredFileEntry[];
}> {
  const allDiscoveredFiles: DiscoveredFileEntry[] = [];
  const subProjectRoots: string[] = [];

  // 1. Recursively discover all source files and sub-project roots
  await discoverFilesRecursively(
    repositoryRootPath,
    repositoryRootPath,
    ignoreResolver,
    allDiscoveredFiles,
    subProjectRoots,
    isMonorepoDetectionEnabled,
  );

  logInformation(
    `Discovered ${allDiscoveredFiles.length} source files in ${repositoryRootPath}`,
  );

  // 2. Determine module boundaries
  const detectedModules = buildModulesFromDiscoveredFiles(
    repositoryRootPath,
    allDiscoveredFiles,
    subProjectRoots,
    isMonorepoDetectionEnabled,
  );

  logInformation(`Detected ${detectedModules.length} modules.`);

  return { detectedModules, allDiscoveredFiles };
}

async function discoverFilesRecursively(
  currentDirectoryPath: string,
  repositoryRootPath: string,
  ignoreResolver: IgnorePatternResolver,
  discoveredFiles: DiscoveredFileEntry[],
  subProjectRoots: string[],
  isMonorepoDetectionEnabled: boolean,
  depth: number = 0,
): Promise<void> {
  const directoryEntries = await readdir(currentDirectoryPath, {
    withFileTypes: true,
  });

  // Check if this directory is a sub-project root (not the repo root itself)
  if (
    isMonorepoDetectionEnabled &&
    depth > 0 &&
    currentDirectoryPath !== repositoryRootPath
  ) {
    const hasProjectManifest = directoryEntries.some((entry) =>
      PROJECT_MANIFEST_FILE_NAMES.includes(entry.name),
    );
    if (hasProjectManifest) {
      const relativePath = convertToRelativePath(
        currentDirectoryPath,
        repositoryRootPath,
      );
      subProjectRoots.push(relativePath);
      logDebug(`Sub-project root detected: ${relativePath}`);
    }
  }

  for (const entry of directoryEntries) {
    const entryAbsolutePath = join(currentDirectoryPath, entry.name);
    const entryRelativePath = convertToRelativePath(
      entryAbsolutePath,
      repositoryRootPath,
    );

    if (ignoreResolver.shouldIgnorePath(entryRelativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await discoverFilesRecursively(
        entryAbsolutePath,
        repositoryRootPath,
        ignoreResolver,
        discoveredFiles,
        subProjectRoots,
        isMonorepoDetectionEnabled,
        depth + 1,
      );
    } else if (entry.isFile() && isFilePathSupportedLanguage(entry.name)) {
      const language = detectLanguageFromFilePath(entry.name);
      if (language !== null) {
        discoveredFiles.push({
          absolutePath: entryAbsolutePath,
          relativePath: entryRelativePath,
          language,
        });
      }
    }
  }
}

function buildModulesFromDiscoveredFiles(
  repositoryRootPath: string,
  discoveredFiles: DiscoveredFileEntry[],
  subProjectRoots: string[],
  isMonorepoDetectionEnabled: boolean,
): DetectedModule[] {
  if (isMonorepoDetectionEnabled && subProjectRoots.length > 0) {
    return buildModulesFromSubProjectRoots(
      discoveredFiles,
      subProjectRoots,
      repositoryRootPath,
    );
  }

  return buildModulesFromDirectoryStructure(discoveredFiles, repositoryRootPath);
}

function buildModulesFromSubProjectRoots(
  discoveredFiles: DiscoveredFileEntry[],
  subProjectRoots: string[],
  repositoryRootPath: string,
): DetectedModule[] {
  const modules: DetectedModule[] = [];

  // Sort roots by depth (deepest first) to assign files to most specific module
  const sortedRoots = [...subProjectRoots].sort(
    (rootA, rootB) => rootB.length - rootA.length,
  );

  const assignedFilePaths = new Set<string>();

  for (const subProjectRoot of sortedRoots) {
    const moduleFiles = discoveredFiles.filter(
      (file) =>
        file.relativePath.startsWith(subProjectRoot + "/") &&
        !assignedFilePaths.has(file.relativePath),
    );

    if (moduleFiles.length === 0) {
      continue;
    }

    for (const file of moduleFiles) {
      assignedFilePaths.add(file.relativePath);
    }

    const moduleName = basename(subProjectRoot);
    const languages = [...new Set(moduleFiles.map((file) => file.language))];
    const entryPointFile = findEntryPointFile(moduleFiles);

    modules.push(createDetectedModule(
      moduleName,
      subProjectRoot,
      moduleFiles,
      languages,
      entryPointFile,
    ));
  }

  // Files not assigned to any sub-project root → "root" module
  const unassignedFiles = discoveredFiles.filter(
    (file) => !assignedFilePaths.has(file.relativePath),
  );
  if (unassignedFiles.length > 0) {
    const languages = [...new Set(unassignedFiles.map((file) => file.language))];
    const entryPointFile = findEntryPointFile(unassignedFiles);
    modules.push(createDetectedModule(
      "root",
      ".",
      unassignedFiles,
      languages,
      entryPointFile,
    ));
  }

  return modules;
}

function buildModulesFromDirectoryStructure(
  discoveredFiles: DiscoveredFileEntry[],
  repositoryRootPath: string,
): DetectedModule[] {
  // Group files by their top-level directory
  const directoryGroups = new Map<string, DiscoveredFileEntry[]>();

  for (const file of discoveredFiles) {
    const topLevelDirectory = getTopLevelDirectory(file.relativePath);
    const existing = directoryGroups.get(topLevelDirectory) ?? [];
    existing.push(file);
    directoryGroups.set(topLevelDirectory, existing);
  }

  const modules: DetectedModule[] = [];

  for (const [directoryName, files] of directoryGroups) {
    const moduleName = directoryName === "." ? "root" : directoryName;
    const locationPath = directoryName === "." ? "." : directoryName;
    const languages = [...new Set(files.map((file) => file.language))];
    const entryPointFile = findEntryPointFile(files);

    modules.push(createDetectedModule(
      moduleName,
      locationPath,
      files,
      languages,
      entryPointFile,
    ));
  }

  return modules;
}

function createDetectedModule(
  moduleName: string,
  locationPath: string,
  files: DiscoveredFileEntry[],
  languages: string[],
  entryPointFilePath: string | null,
): DetectedModule {
  return {
    moduleName,
    purpose: "",
    locationPath,
    publicInterfaceSymbolIdentifiers: [],
    dependencyModuleNames: [],
    dependentModuleNames: [],
    detectedTechnologies: [],
    status: "active",
    containedFilePaths: files.map((file) => file.relativePath),
    containedLanguages: languages,
    entryPointFilePath,
  };
}

function getTopLevelDirectory(relativePath: string): string {
  const firstSlashIndex = relativePath.indexOf("/");
  if (firstSlashIndex === -1) {
    return ".";
  }
  return relativePath.slice(0, firstSlashIndex);
}

function findEntryPointFile(
  files: DiscoveredFileEntry[],
): string | null {
  for (const candidate of ENTRY_POINT_FILE_NAME_CANDIDATES) {
    const matchingFile = files.find((file) => {
      const fileName = file.relativePath.split("/").pop() ?? "";
      return fileName === candidate;
    });
    if (matchingFile) {
      return matchingFile.relativePath;
    }
  }
  return null;
}
