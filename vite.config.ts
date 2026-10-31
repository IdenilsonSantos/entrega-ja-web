import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // ferramentas de teste: ligadas em dev ou com VITE_DEMO_TOOLS=true; fora disso o código some do pacote
  const demoTools = mode === 'development' || (process.env.VITE_DEMO_TOOLS ?? env.VITE_DEMO_TOOLS) === 'true';
  return {
  define: { __DEMO_TOOLS__: JSON.stringify(demoTools) },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Em desenvolvimento, /api vai para a API local (entrega-ja-api)
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('leaflet') ? 'map' : id.includes('node_modules') ? 'vendor' : undefined) },
    },
  },
};
});
