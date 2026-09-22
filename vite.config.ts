import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("vite/preload-helper")) return "vendor-react";
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
            if (id.includes("jspdf") || id.includes("jszip") || id.includes("xlsx")) return "vendor-docs";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@supabase") || id.includes("@tanstack")) return "vendor-data";
            if (id.includes("@radix-ui") || id.includes("@floating-ui")) return "vendor-ui";
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
