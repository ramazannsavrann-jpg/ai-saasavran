// Mobil uygulama (Capacitor) derlemesi: ekranlar telefonun içinde çalışır, veriler aisaasavran.com ve Supabase'den gelir.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  publicDir: false, // site dosyaları (sw.js, config.json…) uygulamaya girmez
  define: {
    // Test: MOBILE_API_BASE="" ile yerel sunucuya bağlanır (e2e/mobil.e2e.ts)
    "import.meta.env.VITE_API_BASE": JSON.stringify(process.env.MOBILE_API_BASE ?? "https://aisaasavran.com"),
    "import.meta.env.VITE_NATIVE_APP": JSON.stringify("1"),
  },
  server: { fs: { allow: [".."] } },
  build: { outDir: process.env.MOBILE_OUT ?? "dist-mobile", emptyOutDir: true, sourcemap: false, rollupOptions: { input: "mobile.html" } },
});
