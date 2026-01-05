import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

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
      reporter: ['text', 'lcov'],
      exclude: [
        '**/riviereTestFixtures.ts',
        '**/ForceGraph/ForceGraph.tsx',
        '**/ForceGraph/GraphRenderingSetup.ts',
      ],
      thresholds: {
        '**/*.ts': {
          lines: 94,
          statements: 94,
          functions: 100,
          branches: 74 
        },
        '**/*.tsx': {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 75 
        },
      },
    },
  },
}));
