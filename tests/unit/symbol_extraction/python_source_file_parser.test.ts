import { describe, it, expect } from "vitest";
import { PythonSourceFileParser } from "../../../source/symbol_extraction/python_parsing/python_source_file_parser.js";

describe("Python Source File Parser", () => {
  it("loads the bundled WASM grammar and extracts Python symbols", async () => {
    const parser = new PythonSourceFileParser();
    await parser.initialize();

    const fileContent = `
import os

class Greeter:
    """Builds greeting messages."""

    def __init__(self, prefix: str = "Hello"):
        self.prefix = prefix

    def greet(self, name: str) -> str:
        return f"{self.prefix}, {name}"

def make_greeting(name: str) -> str:
    return Greeter().greet(name)
`;

    const result = await parser.parseSourceFile(
      "greeter.py",
      fileContent,
      "example",
      "pkg/greeter.py",
    );

    expect(result.extractedSymbols.map((symbol) => symbol.symbolName)).toContain("Greeter");
    expect(result.extractedSymbols.map((symbol) => symbol.symbolName)).toContain("make_greeting");
    expect(result.extractedClasses[0].className).toBe("Greeter");
    expect(result.extractedClasses[0].methods.map((method) => method.methodName)).toContain("greet");
    expect(result.extractedFunctions[0].functionName).toBe("make_greeting");
    expect(result.extractedDependencies[0].importSpecifier).toBe("os");

    parser.dispose();
  });
});
