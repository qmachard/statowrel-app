import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ react() ],
  resolve: {
    alias: {
      '@statowrel/models': path.resolve(__dirname, '../../packages/models/src'),
    },
  },
  server: {
    host: 'localhost',
    port: 3002,
  },
});
