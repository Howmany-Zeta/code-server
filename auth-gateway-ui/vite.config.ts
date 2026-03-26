import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDocenMedia = path.resolve(__dirname, "../src/browser/media/auth-gateway");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@startu/auth-chatbot-shared/apiClient": path.resolve(
        __dirname,
        "../../packages/auth-chatbot-shared/src/apiClient.ts",
      ),
    },
  },
  build: {
    outDir: authDocenMedia,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        entryFileNames: "assets/auth-gateway.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (info) => {
          if (info.name?.endsWith(".css")) {
            return "assets/auth-gateway.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
  base: "./",
});
