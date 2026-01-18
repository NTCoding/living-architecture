import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/tools/dev-workflow',
  test: {
    name: 'dev-workflow',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      include: ['dev-workflow-hooks/handlers/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 80,
      },
    },
  },
}))
