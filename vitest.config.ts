import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@nadfun/shared': './packages/shared/src',
    },
  },
});
