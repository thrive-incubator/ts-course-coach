import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8080);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
});
