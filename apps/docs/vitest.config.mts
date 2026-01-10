import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/docs',
  test: {
    name: '@living-architecture/docs',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['.vitepress/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      include: ['.vitepress/theme/**/*.ts'],
      exclude: ['.vitepress/theme/index.ts', '**/*.d.ts'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
}))
