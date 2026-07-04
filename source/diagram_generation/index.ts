/**
 * Diagram generation barrel export.
 *
 * Exposes public operations for generating module architecture flowcharts
 * and sequence diagrams.
 */

export {
  generateModuleFlowchartDiagram,
} from "./flowchart_generator.js";

export {
  generateModuleSequenceDiagram,
} from "./sequence_diagram_generator.js";

export {
  generateModuleDiagramMarkdown,
  generateAllModuleDiagramFiles,
} from "./module_diagram_generator.js";

export type {
  ModuleDiagramGeneratorInput,
} from "./module_diagram_generator.js";
