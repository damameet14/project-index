/**
 * Module sequence diagram generator.
 *
 * Generates Mermaid `sequenceDiagram` diagrams representing dynamic execution flows,
 * interaction between public entry points, internal module logic, and dependencies.
 */

import type { DetectedModule, ExtractedSymbol, ExtractedFileDependency } from "../contracts/index.js";

/**
 * Sanitize text for Mermaid sequence diagram message labels.
 */
function sanitizeSequenceLabel(text: string): string {
  return text.replace(/[:"'\n;]/g, " ").trim();
}

/**
 * Generate a Mermaid sequence diagram string for a single module.
 */
export function generateModuleSequenceDiagram(
  targetModule: DetectedModule,
  allExtractedSymbols: ExtractedSymbol[],
  fileDependencies: ExtractedFileDependency[],
): string {
  const lines: string[] = [];
  lines.push("sequenceDiagram");
  lines.push("    autonumber");

  const moduleSymbols = allExtractedSymbols.filter(
    (symbol) => symbol.moduleName === targetModule.moduleName,
  );

  const publicSymbols = moduleSymbols.filter(
    (symbol) => symbol.visibility === "public" || targetModule.publicInterfaceSymbolIdentifiers.includes(symbol.symbolIdentifier),
  );

  const internalSymbols = moduleSymbols.filter(
    (symbol) => !publicSymbols.includes(symbol) && (symbol.symbolKind === "function" || symbol.symbolKind === "method" || symbol.symbolKind === "class"),
  );

  const primaryPublicSymbol = publicSymbols[0]?.symbolName
    ? sanitizeSequenceLabel(publicSymbols[0].symbolName)
    : "PublicInterface";

  const primaryInternalSymbol = internalSymbols[0]?.symbolName
    ? sanitizeSequenceLabel(internalSymbols[0].symbolName)
    : "ModuleCore";

  const dependencyNames = targetModule.dependencyModuleNames || [];
  const primaryDependency = dependencyNames[0]
    ? sanitizeSequenceLabel(dependencyNames[0])
    : null;

  // Declare Participants
  lines.push("    actor Client as External Caller");
  lines.push(`    participant PublicAPI as ${primaryPublicSymbol}`);
  lines.push(`    participant InternalCore as ${primaryInternalSymbol}`);
  if (primaryDependency) {
    lines.push(`    participant ExternalDep as ${primaryDependency}`);
  }

  lines.push("");

  // Sequence messages
  const operationName = publicSymbols[0]?.symbolName
    ? `execute ${publicSymbols[0].symbolName}()`
    : "invoke Module Operation";

  lines.push(`    Client->>PublicAPI: ${sanitizeSequenceLabel(operationName)}`);
  lines.push(`    activate PublicAPI`);

  const validateStep = "validate parameters & prepare context";
  lines.push(`    PublicAPI->>InternalCore: ${validateStep}`);
  lines.push(`    activate InternalCore`);

  if (primaryDependency) {
    lines.push(`    InternalCore->>ExternalDep: query / invoke external operation`);
    lines.push(`    activate ExternalDep`);
    lines.push(`    ExternalDep-->>InternalCore: return result data`);
    lines.push(`    deactivate ExternalDep`);
  } else {
    lines.push(`    InternalCore->>InternalCore: execute internal business logic`);
  }

  lines.push(`    InternalCore-->>PublicAPI: return domain operation result`);
  lines.push(`    deactivate InternalCore`);

  lines.push(`    PublicAPI-->>Client: return public execution response`);
  lines.push(`    deactivate PublicAPI`);

  return lines.join("\n");
}
