import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Cloudflare Workers
      '/worker': {
        target: 'https://travel-agent-worker.mauriziogalli1971.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/worker/, ''),
        secure: false,
      },
      // OpenstreetMap API
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        secure: false,
      },
    },
  },
});
