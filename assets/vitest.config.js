import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'coverage/',
        '**/*.config.js'
      ]
    }
  }
});