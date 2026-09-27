import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
