import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build also works from a GitHub Pages subpath.
  base: './',
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Builds the jsdom environment once per worker instead of once per file,
    // while still isolating each file. Setting up jsdom 30 times dominated the
    // run otherwise.
    pool: 'vmThreads',
  },
});
