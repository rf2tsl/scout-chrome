import { defineConfig } from "vite";
import path from "node:path";

/**
 * Build the two content scripts as standalone IIFEs (MV3 content scripts
 * cannot be ES modules). Two separate `vite build` invocations because each
 * script needs distinct rollup output config.
 */
const which = process.env.SCOUT_CONTENT_ENTRY ?? "extension-link";

const ENTRIES: Record<string, { input: string; outFile: string }> = {
  "extension-link": {
    input: path.resolve(__dirname, "src/content/index.ts"),
    outFile: "content.js",
  },
  autofill: {
    input: path.resolve(__dirname, "src/content/autofill.ts"),
    outFile: "content-autofill.js",
  },
};

const cfg = ENTRIES[which];
if (!cfg) throw new Error(`unknown SCOUT_CONTENT_ENTRY=${which}`);

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
      input: cfg.input,
      output: {
        format: "iife",
        entryFileNames: cfg.outFile,
        inlineDynamicImports: true,
      },
    },
  },
});
