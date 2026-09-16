import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localVercelApi } from './scripts/vite-local-api.mjs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [localVercelApi(), react()],
  publicDir: 'data',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        gallery: fileURLToPath(new URL('./index.html', import.meta.url)),
        image25: fileURLToPath(new URL('./gpt-image-2-5/index.html', import.meta.url))
      }
    }
  }
});
