/**
 * Project Index — CLI entry point.
 *
 * A local-first developer tool that generates machine-readable
 * semantic repository indexes for AI coding assistants.
 */

import { createCommandLineProgram } from "./command_line_interface/command_line_program.js";

const program = createCommandLineProgram();
program.parse(process.argv);
