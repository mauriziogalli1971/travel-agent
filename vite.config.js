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
      },
      // SerpApi
      '/serpapi': {
        target: 'https://serpapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/serpapi/, ''),
        secure: false,
      },
      // ipapi
      '/ipapi': {
        target: 'https://api.ipapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ipapi/, ''),
        secure: false,
      },
      // OpenWeather
      '/openweather': {
        target: 'https://api.openweathermap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openweather/, ''),
        secure: false,
      },
      // Open-Meteo
      '/open-meteo': {
        target: ' https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/open-meteo/, ''),
        secure: false,
      },
      // Overpass API
      '/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/overpass/, ''),
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
