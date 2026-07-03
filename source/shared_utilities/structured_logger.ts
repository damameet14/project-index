/**
 * Structured logger.
 *
 * Provides colored console output with log levels.
 * All output goes through this module for consistent formatting.
 */

import chalk from "chalk";

export type LogLevel = "silent" | "error" | "warning" | "information" | "debug";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warning: 2,
  information: 3,
  debug: 4,
};

let currentLogLevel: LogLevel = "information";

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

function shouldLog(messageLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] <= LOG_LEVEL_PRIORITY[currentLogLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function logError(message: string, ...additionalArguments: unknown[]): void {
  if (shouldLog("error")) {
    console.error(
      chalk.red(`[${formatTimestamp()}] ERROR`),
      message,
      ...additionalArguments,
    );
  }
}

export function logWarning(message: string, ...additionalArguments: unknown[]): void {
  if (shouldLog("warning")) {
    console.warn(
      chalk.yellow(`[${formatTimestamp()}] WARN `),
      message,
      ...additionalArguments,
    );
  }
}

export function logInformation(message: string, ...additionalArguments: unknown[]): void {
  if (shouldLog("information")) {
    console.log(
      chalk.blue(`[${formatTimestamp()}] INFO `),
      message,
      ...additionalArguments,
    );
  }
}

export function logDebug(message: string, ...additionalArguments: unknown[]): void {
  if (shouldLog("debug")) {
    console.log(
      chalk.gray(`[${formatTimestamp()}] DEBUG`),
      message,
      ...additionalArguments,
    );
  }
}

export function logSuccess(message: string, ...additionalArguments: unknown[]): void {
  if (shouldLog("information")) {
    console.log(
      chalk.green(`[${formatTimestamp()}] ✓    `),
      message,
      ...additionalArguments,
    );
  }
}
