import { defineConfig } from "vite";
import { resolve } from "node:path";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  root: ".",
  base: "./",
  plugins: [yaml()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        about: resolve(import.meta.dirname, "about.html"),
        notListedSpoke: resolve(import.meta.dirname, "not-listed-spoke.html"),
      },
    },
  },
  server: {
    port: 8000,
  },
});
