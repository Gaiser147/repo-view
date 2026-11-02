import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/repo-view/" : "/",
  define: {
    "import.meta.env.VITE_ANALYSIS_MODE": JSON.stringify(
      mode === "pages" ? "browser" : "server",
    ),
  },
  worker: { format: "es" },
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  build: { chunkSizeWarningLimit: 1100 },
}));
