import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2022", "chrome120"],
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
