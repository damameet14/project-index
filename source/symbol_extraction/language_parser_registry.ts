/**
 * Parser registry.
 *
 * Maps language names to parser implementations.
 * Lazily initializes parsers on first use.
 */

import type { LanguageParserInterface } from "./language_parser_interface.js";
import { logDebug, logInformation } from "../shared_utilities/index.js";

export class LanguageParserRegistry {
  private readonly registeredParsers = new Map<string, LanguageParserInterface>();
  private readonly initializedLanguages = new Set<string>();

  /**
   * Register a parser for a given language.
   */
  registerParser(parser: LanguageParserInterface): void {
    this.registeredParsers.set(parser.languageName, parser);
    logDebug(`Registered parser for language: ${parser.languageName}`);
  }

  /**
   * Get the parser for a given language, initializing it on first access.
   * Returns null if no parser is registered for the language.
   */
  async getParserForLanguage(
    languageName: string,
  ): Promise<LanguageParserInterface | null> {
    const parser = this.registeredParsers.get(languageName);

    if (parser === undefined) {
      return null;
    }

    if (!this.initializedLanguages.has(languageName)) {
      logInformation(`Initializing ${languageName} parser...`);
      await parser.initialize();
      this.initializedLanguages.add(languageName);
    }

    return parser;
  }

  /**
   * Get all registered language names.
   */
  getRegisteredLanguageNames(): string[] {
    return [...this.registeredParsers.keys()];
  }

  /**
   * Check whether a parser is registered for the given language.
   */
  isLanguageSupported(languageName: string): boolean {
    return this.registeredParsers.has(languageName);
  }

  /**
   * Dispose all initialized parsers and release resources.
   */
  disposeAllParsers(): void {
    for (const [languageName, parser] of this.registeredParsers) {
      if (this.initializedLanguages.has(languageName)) {
        parser.dispose();
      }
    }
    this.initializedLanguages.clear();
  }
}
