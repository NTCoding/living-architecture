import path from 'node:path';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/riviere-cli',
  test: {
    name: '@living-architecture/riviere-cli',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as ['text', ['lcov', { projectRoot: string }]],
      exclude: [
        '**/*test-fixtures.ts',
        // extract-output-formatter.ts: dry-run output formatting, tested via CLI integration tests.
        // Contains v8 ignore comments but coverage provider doesn't respect them consistently.
        'src/platform/infra/cli-presentation/extract-output-formatter.ts',
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
}));
