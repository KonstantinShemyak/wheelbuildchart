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
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        notListedSpoke: resolve(__dirname, "not-listed-spoke.html"),
      },
    },
  },
  server: {
    port: 8000,
  },
});
