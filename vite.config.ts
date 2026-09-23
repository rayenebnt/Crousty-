import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(three|@react-three|three-stdlib|troika|meshline|maath|camera-controls)/.test(id)) return "three";
        },
      },
    },
  },
});
