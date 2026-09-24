import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // Node 26 + jsdom treats an opaque origin as storage-disabled.
        url: 'http://localhost/'
      }
    },
    setupFiles: ['./test/vitest.setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'scripts/**/*.test.mjs'],
    exclude: ['src/apimartClient.test.js'],
    testTimeout: 10_000
  }
});
