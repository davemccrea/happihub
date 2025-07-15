import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.js',
        '**/vendor/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': new URL('./js', import.meta.url).pathname
    }
  }
})