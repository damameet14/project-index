/**
 * Configuration file loader.
 *
 * Uses cosmiconfig to discover and load Project Index configuration
 * from standard locations (package.json, .project-indexrc, etc.).
 * Merges discovered values with defaults.
 */

import { cosmiconfig } from "cosmiconfig";
import {
  DEFAULT_PROJECT_INDEX_CONFIGURATION,
  type ProjectIndexConfiguration,
} from "./configuration_schema.js";
import { logDebug, logInformation } from "../shared_utilities/index.js";

const CONFIGURATION_MODULE_NAME = "project-index";

type ProjectIndexConfigurationFile = Partial<ProjectIndexConfiguration> & {
  /** Backward-compatible/documented alias for restrictToIncludePaths. */
  readonly sourceDirectories?: string[];
};

/**
 * Load Project Index configuration by searching standard config file locations.
 * Returns the merged configuration (user overrides + defaults).
 */
export async function loadProjectIndexConfiguration(
  searchFromDirectory: string,
): Promise<ProjectIndexConfiguration> {
  const explorer = cosmiconfig(CONFIGURATION_MODULE_NAME, {
    searchPlaces: [
      "package.json",
      ".project-indexrc",
      ".project-indexrc.json",
      ".project-indexrc.yaml",
      ".project-indexrc.yml",
      "project-index.config.json",
      "project-index.config.js",
      "project-index.config.cjs",
      "project-index.config.mjs",
    ],
  });

  const discoveredConfiguration = await explorer.search(searchFromDirectory);

  if (discoveredConfiguration === null || discoveredConfiguration.isEmpty) {
    logDebug("No configuration file found, using defaults.");
    return { ...DEFAULT_PROJECT_INDEX_CONFIGURATION };
  }

  logInformation(
    `Configuration loaded from: ${discoveredConfiguration.filepath}`,
  );

  const userProvidedValues =
    discoveredConfiguration.config as ProjectIndexConfigurationFile;

  return mergeConfigurationWithDefaults(userProvidedValues);
}

function mergeConfigurationWithDefaults(
  partialConfiguration: ProjectIndexConfigurationFile,
): ProjectIndexConfiguration {
  return {
    outputDirectoryName:
      partialConfiguration.outputDirectoryName ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.outputDirectoryName,
    enabledLanguages:
      partialConfiguration.enabledLanguages ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.enabledLanguages,
    additionalIgnorePatterns:
      partialConfiguration.additionalIgnorePatterns ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.additionalIgnorePatterns,
    restrictToIncludePaths:
      partialConfiguration.restrictToIncludePaths ??
      partialConfiguration.sourceDirectories ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.restrictToIncludePaths,
    isMonorepoDetectionEnabled:
      partialConfiguration.isMonorepoDetectionEnabled ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.isMonorepoDetectionEnabled,
    manualEntryPointPaths:
      partialConfiguration.manualEntryPointPaths ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.manualEntryPointPaths,
    isVerboseLoggingEnabled:
      partialConfiguration.isVerboseLoggingEnabled ??
      DEFAULT_PROJECT_INDEX_CONFIGURATION.isVerboseLoggingEnabled,
  };
}
