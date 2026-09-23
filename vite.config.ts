import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // React à part : sinon il part dans le paquet 3D et tout se charge d'un coup.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\//.test(id)) return "react";
          if (/node_modules\/(three|@react-three|three-stdlib|troika|meshline|maath|camera-controls)/.test(id)) return "three";
        },
      },
    },
  },
});
