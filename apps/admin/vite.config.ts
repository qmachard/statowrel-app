import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ react() ],
  resolve: {
    alias: {
      '@statowrel/models': path.resolve(__dirname, '../../packages/models/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // Deux pages : la présentation à la racine, la console sous /admin/.
      input: {
        home: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    host: 'localhost',
    port: 3003,
  },
});
