import path from 'node:path'
import { defineConfig } from 'vitest/config'

const repoRoot = path.resolve(__dirname, '../../..')

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as [
        'text',
        ['lcov', { projectRoot: string }],
      ],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/__fixtures__/**'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
})
