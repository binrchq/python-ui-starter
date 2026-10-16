import { defineConfig } from "vite";

// The production bundle is written directly into the Qt resource directory so
// the packaged application can serve it over the app:// scheme.
export default defineConfig({
  base: "./",
  build: {
    outDir: "../app/resources/web",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});