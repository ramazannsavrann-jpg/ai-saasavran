import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: {
    outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 700,
    // Kütüphaneler ayrı parça: uygulama kodu değişince telefon bunları yeniden indirmez (18 Kasım)
    rollupOptions: { output: { manualChunks: (id: string) =>
      /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id) ? "react"
      : /node_modules\/@supabase\//.test(id) ? "supabase" : undefined } },
  },
});
