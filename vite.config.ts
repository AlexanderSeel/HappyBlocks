import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@babylonjs/havok"],
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
