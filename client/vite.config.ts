import { defineConfig } from 'vite';

const target = 'http://localhost:3001';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Pastas sincronizadas (OneDrive) às vezes perdem eventos de arquivo.
    watch: { usePolling: true, interval: 250 },
    proxy: {
      '/ws': { target, ws: true },
      '/api': { target },
      '/uploads': { target },
    },
  },
});
