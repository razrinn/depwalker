import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'test/**',
        'src/index.ts', // CLI entry point - will be tested via integration
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Test file patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],

    // Global test configuration
    globals: true,

    // Timeout settings
    testTimeout: 30000,
    hookTimeout: 30000,

    // Reporter settings
    reporters: ['verbose'],

    // Setup files
    setupFiles: ['./test/setup.ts'],
  },
});
