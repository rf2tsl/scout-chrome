import { defineConfig } from "vite";
import path from "node:path";

/**
 * Separate build for the content script. Chrome MV3 content scripts cannot
 * be ES modules, so we emit a self-contained IIFE with all imports inlined.
 *
 * Run after `vite build` (the main config) so we don't wipe its output.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    target: "esnext",
    minify: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/content/index.ts"),
      output: {
        format: "iife",
        entryFileNames: "content.js",
        inlineDynamicImports: true,
      },
    },
  },
});
