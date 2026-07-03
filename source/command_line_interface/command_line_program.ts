/**
 * CLI program setup.
 *
 * Defines the Commander program with all supported commands.
 * This is the public interface for the command line.
 */

import { Command } from "commander";
import { initializeCommand } from "./commands/initialize_command.js";
import { scanCommand } from "./commands/scan_command.js";
import { watchCommand } from "./commands/watch_command.js";
import { validateCommand } from "./commands/validate_command.js";
import { statisticsCommand } from "./commands/statistics_command.js";
import { cleanCommand } from "./commands/clean_command.js";
import { doctorCommand } from "./commands/doctor_command.js";
import { queryCommand } from "./commands/query_command.js";

export function createCommandLineProgram(): Command {
  const program = new Command();

  program
    .name("project-index")
    .description(
      "Generate machine-readable semantic repository indexes for AI coding assistants.",
    )
    .version("1.0.0");

  program.addCommand(initializeCommand());
  program.addCommand(scanCommand());
  program.addCommand(watchCommand());
  program.addCommand(validateCommand());
  program.addCommand(statisticsCommand());
  program.addCommand(cleanCommand());
  program.addCommand(doctorCommand());
  program.addCommand(queryCommand());

  return program;
}
