import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/riviere-extract-ts-use-cases',
  test: {
    name: '@living-architecture/riviere-extract-ts-use-cases',
    watch: false,
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    include: ['src/**/*.{test,spec}.{ts,mts}'],
    reporters: ['default'],
    coverage: { enabled: false },
  },
}))
