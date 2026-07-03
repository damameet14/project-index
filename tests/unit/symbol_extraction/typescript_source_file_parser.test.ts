import { describe, it, expect } from "vitest";
import { TypeScriptSourceFileParser } from "../../../source/symbol_extraction/typescript_parsing/typescript_source_file_parser.js";

describe("TypeScript Source File Parser", () => {
  it("extracts symbols correctly from a simple TypeScript file", async () => {
    const parser = new TypeScriptSourceFileParser();
    await parser.initialize();

    const fileContent = `
      export const myNumber = 42;
      export function myFunction(a: string): number { return 1; }
      export class MyClass {
        public property = "test";
        private method(): void {}
      }
    `;

    const result = await parser.parseSourceFile("test.ts", fileContent, "testModule", "test.ts");

    // Check variables
    const numberSymbol = result.extractedSymbols.find((s) => s.symbolName === "myNumber");
    expect(numberSymbol).toBeDefined();
    expect(numberSymbol?.symbolKind).toBe("constant");
    expect(numberSymbol?.isExported).toBe(true);

    // Check functions
    expect(result.extractedFunctions.length).toBe(1);
    expect(result.extractedFunctions[0].functionName).toBe("myFunction");
    expect(result.extractedFunctions[0].parameters.length).toBe(1);

    // Check classes
    expect(result.extractedClasses.length).toBe(1);
    expect(result.extractedClasses[0].className).toBe("MyClass");
    expect(result.extractedClasses[0].properties.length).toBe(1);
    expect(result.extractedClasses[0].properties[0].propertyName).toBe("property");
    expect(result.extractedClasses[0].methods.length).toBe(1);
    expect(result.extractedClasses[0].methods[0].methodName).toBe("method");
    expect(result.extractedClasses[0].methods[0].visibility).toBe("private");
  });

  it("extracts class dependencies", async () => {
    const parser = new TypeScriptSourceFileParser();
    await parser.initialize();

    const fileContent = `
      import { something } from "./other.ts";
      export function doSomething() { something(); }
    `;

    const result = await parser.parseSourceFile("test.ts", fileContent, "testModule", "test.ts");

    expect(result.extractedDependencies.length).toBe(1);
    expect(result.extractedDependencies[0].importSpecifier).toBe("./other.ts");
    expect(result.extractedDependencies[0].importedSymbolNames).toContain("something");
  });
});
