/**
 * Module flowchart diagram generator.
 *
 * Generates Mermaid `flowchart TD` diagrams representing module architecture,
 * public interface symbols, internal components, and module dependencies.
 */

import type { DetectedModule, ExtractedSymbol, ExtractedFileDependency } from "../contracts/index.js";

/**
 * Sanitize label text for use inside Mermaid double-quoted labels.
 */
function sanitizeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/[<>{}\\]/g, "");
}

/**
 * Generate a Mermaid flowchart diagram string for a single module.
 */
export function generateModuleFlowchartDiagram(
  targetModule: DetectedModule,
  allExtractedSymbols: ExtractedSymbol[],
  fileDependencies: ExtractedFileDependency[],
  allDetectedModules: DetectedModule[],
): string {
  const lines: string[] = [];
  lines.push("flowchart TD");

  const moduleSymbols = allExtractedSymbols.filter(
    (symbol) => symbol.moduleName === targetModule.moduleName,
  );

  const publicSymbols = moduleSymbols.filter((symbol) => {
    const isPublicByIdentifier = targetModule.publicInterfaceSymbolIdentifiers.some(
      (publicIdentifier) => publicIdentifier === symbol.symbolIdentifier || publicIdentifier.endsWith(`::${symbol.symbolName}`),
    );
    return isPublicByIdentifier || symbol.visibility === "public";
  });

  const internalSymbols = moduleSymbols.filter(
    (symbol) => !publicSymbols.includes(symbol) && (symbol.symbolKind === "class" || symbol.symbolKind === "function" || symbol.symbolKind === "interface"),
  );

  let nodeIdCounter = 1;
  const symbolToNodeIdMap = new Map<string, string>();

  // 1. Public Interface Subgraph
  lines.push("  subgraph PublicInterface[\"Public Interface\"]");
  if (publicSymbols.length > 0) {
    for (const symbol of publicSymbols.slice(0, 10)) { // Limit to 10 key public symbols for clarity
      const nodeId = `public_${nodeIdCounter++}`;
      symbolToNodeIdMap.set(symbol.symbolIdentifier, nodeId);
      const safeName = sanitizeMermaidLabel(symbol.symbolName);
      const kindLabel = symbol.symbolKind;
      lines.push(`    ${nodeId}["${safeName} (${kindLabel})"]`);
    }
  } else {
    const entryNodeId = `public_${nodeIdCounter++}`;
    const entryPointName = targetModule.entryPointFilePath
      ? sanitizeMermaidLabel(targetModule.entryPointFilePath)
      : "Module Entry";
    lines.push(`    ${entryNodeId}["${entryPointName}"]`);
  }
  lines.push("  end");

  // 2. Internal Implementation Subgraph
  lines.push("  subgraph InternalImplementation[\"Internal Implementation\"]");
  if (internalSymbols.length > 0) {
    for (const symbol of internalSymbols.slice(0, 12)) { // Limit to 12 internal symbols
      const nodeId = `internal_${nodeIdCounter++}`;
      symbolToNodeIdMap.set(symbol.symbolIdentifier, nodeId);
      const safeName = sanitizeMermaidLabel(symbol.symbolName);
      const kindLabel = symbol.symbolKind;
      lines.push(`    ${nodeId}["${safeName} (${kindLabel})"]`);
    }
  } else {
    lines.push(`    internal_core["${sanitizeMermaidLabel(targetModule.moduleName)} Core Logic"]`);
  }
  lines.push("  end");

  // 3. External Dependencies Subgraph
  const dependencyModuleNames = targetModule.dependencyModuleNames || [];
  lines.push("  subgraph ExternalDependencies[\"Dependencies\"]");
  const dependencyNodeIdMap = new Map<string, string>();
  if (dependencyModuleNames.length > 0) {
    for (const depModuleName of dependencyModuleNames) {
      const depNodeId = `dep_${nodeIdCounter++}`;
      dependencyNodeIdMap.set(depModuleName, depNodeId);
      const safeDepName = sanitizeMermaidLabel(depModuleName);
      lines.push(`    ${depNodeId}["${safeDepName}"]`);
    }
  } else {
    lines.push(`    dep_none["No External Module Dependencies"]`);
  }
  lines.push("  end");

  // 4. Edges: Public Interface -> Internal Implementation
  lines.push("");
  lines.push("  %% Relationships");
  const publicNodeIds = Array.from(symbolToNodeIdMap.entries())
    .filter(([id]) => id.startsWith("public_"))
    .map(([, nodeId]) => nodeId);

  const internalNodeIds = Array.from(symbolToNodeIdMap.entries())
    .filter(([id]) => id.startsWith("internal_"))
    .map(([, nodeId]) => nodeId);

  if (publicNodeIds.length > 0 && internalNodeIds.length > 0) {
    // Connect first few public interface nodes to internal nodes
    for (let i = 0; i < Math.min(publicNodeIds.length, 3); i++) {
      const targetInternalNodeId = internalNodeIds[i % internalNodeIds.length];
      lines.push(`  ${publicNodeIds[i]} --> ${targetInternalNodeId}`);
    }
  } else if (publicNodeIds.length > 0) {
    lines.push(`  ${publicNodeIds[0]} --> internal_core`);
  }

  // Edges: Internal Implementation -> Dependencies
  if (dependencyModuleNames.length > 0) {
    const sourceNodeId = internalNodeIds.length > 0 ? internalNodeIds[0] : (publicNodeIds[0] || "internal_core");
    for (const depModuleName of dependencyModuleNames) {
      const depNodeId = dependencyNodeIdMap.get(depModuleName);
      if (depNodeId) {
        lines.push(`  ${sourceNodeId} --> ${depNodeId}`);
      }
    }
  }

  return lines.join("\n");
}
