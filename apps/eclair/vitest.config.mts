import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/eclair',
  plugins: [react()],
  resolve: {alias: {'@': resolve(__dirname, './src'),},},
  test: {
    name: '@living-architecture/eclair',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as ['text', ['lcov', { projectRoot: string }]],
      exclude: [
        '**/riviereTestFixtures.ts',
        '**/ForceGraph/ForceGraph.tsx',
        '**/ForceGraph/GraphRenderingSetup.ts',
      ],
      thresholds: {
        '**/*.ts': {
          lines: 95,
          statements: 95,
          functions: 100,
          branches: 93
        },
        '**/*.tsx': {
          lines: 90,
          statements: 90,
          functions: 88,
          branches: 83
        },
      },
    },
  },
}));
