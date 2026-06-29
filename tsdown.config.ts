import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["./src/index.ts"],
  format: "esm",
  minify: "dce-only",
  nodeProtocol: true,
  outDir: "./dist",
  sourcemap: false,
  treeshake: true,
});
