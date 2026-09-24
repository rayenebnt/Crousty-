import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // React à part : il change rarement, le navigateur le garde en cache.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\//.test(id)) return "react";
        },
      },
    },
  },
});
