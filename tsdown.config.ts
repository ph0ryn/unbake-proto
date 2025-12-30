import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["./src/index.ts"],
  format: "esm",
  minify: "dce-only",
  noExternal: "**",
  nodeProtocol: true,
  onSuccess: "sort-package-json",
  outDir: "./dist",
  sourcemap: false,
  treeshake: true,
});
