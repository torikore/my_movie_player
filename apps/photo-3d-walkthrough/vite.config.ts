import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [
    {
      name: "dev-entry",
      transformIndexHtml(html) {
        if (command !== "serve") return html;
        return html
          .replace(/<link rel="stylesheet" href="\.\/assets\/style\.css"\s*\/?>/, "")
          .replace(
            /<script type="module" src="\.\/assets\/app\.js"><\/script>/,
            '<script type="module" src="/src/main.ts"></script>',
          );
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: resolve(root, "src/main.ts"),
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (asset) => {
          if (asset.name?.endsWith(".css")) return "assets/style.css";
          return "assets/[name][extname]";
        },
      },
    },
  },
}));
