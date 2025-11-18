import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      app: path.resolve(__dirname, 'src/app'),
      shared: path.resolve(__dirname, 'src/shared'),
      entities: path.resolve(__dirname, 'src/entities'),
      features: path.resolve(__dirname, 'src/features'),
      widgets: path.resolve(__dirname, 'src/widgets'),
      pages: path.resolve(__dirname, 'src/pages'),
      // ❌ IMG.LY alias NI OLIB TASHLAYMIZ!
    },
  },

  optimizeDeps: {
    exclude: ['@imgly/background-removal'], // ⬅ dynamic import uchun shart
  },

  build: {
    target: 'esnext',
    modulePreload: false,
    assetsInlineLimit: 0, // ⬅ WASM inline bo‘lmasin
  },

  worker: {
    format: 'es',
  },

  assetsInclude: ['**/*.wasm'],
});
