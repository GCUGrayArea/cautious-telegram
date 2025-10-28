import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/utils/**/*.js'],
      exclude: ['src/utils/**/*.test.js', 'src/utils/api.js', 'src/utils/preview.js', 'src/utils/screenRecorder.js', 'src/utils/preact-reconciler-polyfill.js'],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
});
