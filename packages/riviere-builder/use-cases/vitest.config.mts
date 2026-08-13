import path from 'node:path'
import { defineConfig } from 'vitest/config'

const repoRoot = path.resolve(__dirname, '../../..')

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/riviere-builder-use-cases',
  test: {
    name: '@living-architecture/riviere-builder-use-cases',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,mts}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as [
        'text',
        ['lcov', { projectRoot: string }],
      ],
    },
  },
}))
