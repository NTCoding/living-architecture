import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const repoRoot = path.resolve(__dirname, '..')

export default defineConfig(() => ({
  root: __dirname,
  plugins: [react()],
  cacheDir: 'node_modules/.vite/ui',
  test: {
    name: '@dev-factory-v1/ui',
    watch: false,
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as [
        'text',
        ['lcov', { projectRoot: string }],
      ],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.tsx', 'src/main.tsx'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
}))
