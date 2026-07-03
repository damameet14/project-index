/**
 * Contracts barrel export.
 *
 * Public interface for all data contracts used across the application.
 */

export type {
  SymbolKind,
  SymbolVisibility,
  SymbolRelationshipKind,
  SymbolRelationship,
  ExtractedSymbol,
} from "./symbol_contracts.js";

export type {
  ModuleStatus,
  DetectedModule,
} from "./module_contracts.js";

export type {
  ExtractedClassMethod,
  ExtractedClassProperty,
  ExtractedParameterDefinition,
  ExtractedClass,
} from "./class_contracts.js";

export type {
  ExtractedFunction,
} from "./function_contracts.js";

export type {
  DependencyClassification,
  ExtractedFileDependency,
  ModuleDependencyEdge,
  CircularDependencyChain,
  DependencyGraph,
} from "./dependency_contracts.js";

export type {
  ProjectContextSummary,
  ProjectContextModuleSummary,
  ProjectContextConventions,
  ProjectContextDirectoryDescription,
  ProjectContext,
} from "./project_context_contracts.js";

export type {
  ScanStatistics,
} from "./scan_statistics_contracts.js";

export type {
  SingleFileParseResult,
  RepositoryScanResult,
  ScanMetadata,
} from "./scan_result_contracts.js";
