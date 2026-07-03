import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["source/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: ["web-tree-sitter"],
  noExternal: [],
});
