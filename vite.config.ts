import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

/**
 * Multi-entry build:
 *   panel/index.html → panel/index.js (bundled with React)
 *   src/background/index.ts → background.js
 *   src/content/index.ts → content.js
 *
 * After build, manifest.json + icons are copied into dist/ so the folder is
 * ready for `chrome://extensions → Load unpacked`.
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: "scout-extension-static",
      closeBundle() {
        const dist = path.resolve(__dirname, "dist");
        fs.copyFileSync(
          path.resolve(__dirname, "manifest.json"),
          path.resolve(dist, "manifest.json"),
        );
        const iconsSrc = path.resolve(__dirname, "public/icons");
        const iconsDst = path.resolve(dist, "icons");
        if (fs.existsSync(iconsSrc)) {
          fs.mkdirSync(iconsDst, { recursive: true });
          for (const f of fs.readdirSync(iconsSrc)) {
            fs.copyFileSync(path.join(iconsSrc, f), path.join(iconsDst, f));
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        panel: path.resolve(__dirname, "src/panel/index.html"),
        background: path.resolve(__dirname, "src/background/index.ts"),
        // content.js is built separately by vite.content.config.ts as IIFE,
        // because MV3 content scripts cannot be ES modules.
      },
      output: {
        // Predictable filenames so manifest.json can reference them statically.
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "esnext",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
});
