/**
 * Project module detector.
 *
 * Scans the repository to identify logical modules (packages, feature
 * directories, monorepo sub-projects). Groups files into modules
 * based on project manifests and directory structure.
 */

import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  restrictToIncludePaths: string[] = [],
): Promise<{
  detectedModules: DetectedModule[];
  allDiscoveredFiles: DiscoveredFileEntry[];
}> {
  const allDiscoveredFiles: DiscoveredFileEntry[] = [];
  const subProjectRoots: string[] = [];
  const normalizedIncludePaths = normalizeIncludePaths(restrictToIncludePaths);

  // 1. Recursively discover all source files and sub-project roots
  await discoverFilesRecursively(
    repositoryRootPath,
    repositoryRootPath,
    ignoreResolver,
    allDiscoveredFiles,
    subProjectRoots,
    isMonorepoDetectionEnabled,
    normalizedIncludePaths,
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
  normalizedIncludePaths: string[],
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
      if (!shouldDescendIntoDirectory(entryRelativePath, normalizedIncludePaths)) {
        continue;
      }

      await discoverFilesRecursively(
        entryAbsolutePath,
        repositoryRootPath,
        ignoreResolver,
        discoveredFiles,
        subProjectRoots,
        isMonorepoDetectionEnabled,
        normalizedIncludePaths,
        depth + 1,
      );
    } else if (
      entry.isFile() &&
      isPathWithinIncludedPaths(entryRelativePath, normalizedIncludePaths) &&
      isFilePathSupportedLanguage(entry.name)
    ) {
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

function normalizeIncludePaths(includePaths: string[]): string[] {
  return includePaths
    .map((includePath) => includePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter((includePath) => includePath.length > 0 && includePath !== ".");
}

function shouldDescendIntoDirectory(
  relativeDirectoryPath: string,
  normalizedIncludePaths: string[],
): boolean {
  if (normalizedIncludePaths.length === 0) {
    return true;
  }

  const normalizedDirectoryPath = relativeDirectoryPath.replace(/\\/g, "/");
  return normalizedIncludePaths.some(
    (includePath) =>
      includePath === normalizedDirectoryPath ||
      includePath.startsWith(`${normalizedDirectoryPath}/`) ||
      normalizedDirectoryPath.startsWith(`${includePath}/`),
  );
}

function isPathWithinIncludedPaths(
  relativeFilePath: string,
  normalizedIncludePaths: string[],
): boolean {
  if (normalizedIncludePaths.length === 0) {
    return true;
  }

  const normalizedFilePath = relativeFilePath.replace(/\\/g, "/");
  return normalizedIncludePaths.some(
    (includePath) =>
      normalizedFilePath === includePath ||
      normalizedFilePath.startsWith(`${includePath}/`),
  );
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
  const modulePaths = new Set<string>();
  modulePaths.add("."); // Root module is always there

  const isEntryPointFile = (fileName: string) => {
    return ["index.ts", "index.tsx", "index.js", "index.jsx", "__init__.py"].includes(fileName);
  };

  const hasModuleDeclaration = (dirPath: string) => {
    if (dirPath === ".") return false;
    const moduleMdPath = join(repositoryRootPath, dirPath, "MODULE.md");
    return existsSync(moduleMdPath);
  };

  // Find all directories that contain entry points or have MODULE.md on disk,
  // plus the top-level directories of all discovered files.
  for (const file of discoveredFiles) {
    const relativePath = file.relativePath;
    const parts = relativePath.split("/");
    const fileName = parts.pop() ?? "";

    if (parts.length > 0) {
      modulePaths.add(parts[0]);
    }

    let currentDir = parts.join("/");
    while (currentDir && currentDir !== ".") {
      if (isEntryPointFile(fileName) || hasModuleDeclaration(currentDir)) {
        modulePaths.add(currentDir);
      }
      const dirParts = currentDir.split("/");
      dirParts.pop();
      currentDir = dirParts.join("/");
    }
  }

  // Sort modules by depth (deepest first) to assign files to the most specific module
  const sortedModulePaths = [...modulePaths].sort((a, b) => b.length - a.length);

  // Group files by module
  const moduleFilesMap = new Map<string, DiscoveredFileEntry[]>();
  for (const modulePath of sortedModulePaths) {
    moduleFilesMap.set(modulePath, []);
  }

  const assignedFiles = new Set<string>();
  for (const file of discoveredFiles) {
    for (const modulePath of sortedModulePaths) {
      if (
        (modulePath === "." && !assignedFiles.has(file.relativePath)) ||
        (file.relativePath.startsWith(modulePath + "/") && !assignedFiles.has(file.relativePath))
      ) {
        moduleFilesMap.get(modulePath)!.push(file);
        assignedFiles.add(file.relativePath);
        break;
      }
    }
  }

  // Construct DetectedModule objects
  const modules: DetectedModule[] = [];

  for (const modulePath of sortedModulePaths) {
    const files = moduleFilesMap.get(modulePath) ?? [];
    if (files.length === 0 && modulePath !== ".") {
      continue;
    }

    const moduleName = modulePath === "." ? "root" : modulePath;
    const locationPath = modulePath;
    const languages = [...new Set(files.map((file) => file.language))];
    const entryPointFile = findEntryPointFile(files);

    // Find parent module: the longest modulePath that is a prefix of this module's path
    let parentModuleName: string | null = null;
    if (modulePath !== ".") {
      const parts = modulePath.split("/");
      parts.pop();
      let currentParent = parts.join("/");
      while (currentParent) {
        if (modulePaths.has(currentParent)) {
          parentModuleName = currentParent === "." ? "root" : currentParent;
          break;
        }
        const tempParts = currentParent.split("/");
        tempParts.pop();
        currentParent = tempParts.join("/");
      }
      if (parentModuleName === null && modulePaths.has(".")) {
        parentModuleName = "root";
      }
    }

    modules.push({
      ...createDetectedModule(
        moduleName,
        locationPath,
        files,
        languages,
        entryPointFile,
      ),
      parentModuleName,
      subModuleNames: [],
    });
  }

  // Populate subModuleNames
  for (const mod of modules) {
    if (mod.parentModuleName) {
      const parent = modules.find((m) => m.moduleName === mod.parentModuleName);
      if (parent) {
        if (!parent.subModuleNames) {
          (parent as any).subModuleNames = [];
        }
        parent.subModuleNames!.push(mod.moduleName);
      }
    }
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
    parentModuleName: null,
    subModuleNames: [],
  };
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
