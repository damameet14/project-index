import { describe, it, expect } from "vitest";
import {
  detectLanguageFromFilePath,
  getFileExtensionsForLanguage,
  isFilePathSupportedLanguage,
} from "../../../source/repository_scanning/programming_language_detector.js";

describe("Programming Language Detector", () => {
  describe("detectLanguageFromFilePath", () => {
    it("detects typescript for .ts, .tsx, .mts, .cts", () => {
      expect(detectLanguageFromFilePath("file.ts")).toBe("typescript");
      expect(detectLanguageFromFilePath("component.tsx")).toBe("typescript");
      expect(detectLanguageFromFilePath("script.mts")).toBe("typescript");
      expect(detectLanguageFromFilePath("script.cts")).toBe("typescript");
    });

    it("detects python for .py, .pyi", () => {
      expect(detectLanguageFromFilePath("script.py")).toBe("python");
      expect(detectLanguageFromFilePath("typing.pyi")).toBe("python");
    });

    it("handles case insensitivity", () => {
      expect(detectLanguageFromFilePath("FILE.TS")).toBe("typescript");
      expect(detectLanguageFromFilePath("SCRIPT.PY")).toBe("python");
    });

    it("returns null for unsupported extensions", () => {
      expect(detectLanguageFromFilePath("style.css")).toBeNull();
      expect(detectLanguageFromFilePath("index.html")).toBeNull();
      expect(detectLanguageFromFilePath("README.md")).toBeNull();
    });
  });

  describe("getFileExtensionsForLanguage", () => {
    it("returns extensions for typescript", () => {
      const extensions = getFileExtensionsForLanguage("typescript");
      expect(extensions).toContain(".ts");
      expect(extensions).toContain(".tsx");
    });

    it("returns extensions for python", () => {
      const extensions = getFileExtensionsForLanguage("python");
      expect(extensions).toContain(".py");
      expect(extensions).toContain(".pyi");
    });
  });

  describe("isFilePathSupportedLanguage", () => {
    it("returns true for supported files", () => {
      expect(isFilePathSupportedLanguage("test.ts")).toBe(true);
      expect(isFilePathSupportedLanguage("test.py")).toBe(true);
    });

    it("returns false for unsupported files", () => {
      expect(isFilePathSupportedLanguage("test.txt")).toBe(false);
      expect(isFilePathSupportedLanguage("test.html")).toBe(false);
    });
  });
});
