import { defineConfig } from 'vitest/config'

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
    coverage: { enabled: false },
  },
}))
