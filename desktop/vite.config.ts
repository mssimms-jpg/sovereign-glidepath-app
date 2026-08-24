import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string };
const [major = "1", minor = "0", patch = "0"] = pkg.version.split(".");

// Standalone SPA build for the Electron desktop package.
// Bypasses TanStack Start (no SSR) so the output is a plain
// index.html + assets/ loadable via file:// in Electron.
export default defineConfig({
  root: __dirname,
  base: "./",
  publicDir: path.resolve(__dirname, "..", "public"),
  plugins: [react()],
  define: {
    __APP_BUILD__: JSON.stringify(patch),
    __APP_VERSION__: JSON.stringify(`${major}.${minor}`),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..", "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "..", "dist-desktop"),
    emptyOutDir: true,
    target: "es2022",
  },
});
