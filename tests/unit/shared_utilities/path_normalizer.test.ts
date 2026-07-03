import { describe, it, expect } from "vitest";
import {
  normalizeToForwardSlashes,
  convertToRelativePath,
  resolveAbsolutePath,
  extractDirectoryPath,
  extractFileName,
} from "../../../source/shared_utilities/path_normalizer.js";

describe("Path Normalizer", () => {
  describe("normalizeToForwardSlashes", () => {
    it("converts backslashes to forward slashes", () => {
      expect(normalizeToForwardSlashes("some\\windows\\path")).toBe("some/windows/path");
    });

    it("leaves forward slashes unchanged", () => {
      expect(normalizeToForwardSlashes("some/unix/path")).toBe("some/unix/path");
    });
  });

  describe("extractDirectoryPath", () => {
    it("extracts directory from a file path", () => {
      expect(extractDirectoryPath("src/components/Button.tsx")).toBe("src/components");
    });

    it("returns empty string if no directory", () => {
      expect(extractDirectoryPath("Button.tsx")).toBe("");
    });
  });

  describe("extractFileName", () => {
    it("extracts file name from a path", () => {
      expect(extractFileName("src/components/Button.tsx")).toBe("Button.tsx");
    });

    it("returns the full string if no slashes exist", () => {
      expect(extractFileName("Button.tsx")).toBe("Button.tsx");
    });
  });
});
