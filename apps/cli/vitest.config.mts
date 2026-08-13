import path from 'node:path';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig(() => ({
  root: repoRoot,
  cacheDir: 'node_modules/.vite/packages/riviere-cli',
  resolve: {
    alias: [
      {
        find: /^@living-architecture\/riviere-builder-use-cases\/(.*)$/,
        replacement: path.resolve(repoRoot, 'packages/riviere-builder/use-cases/src/$1'),
      },
      {
        find: /^@living-architecture\/riviere-extract-ts-use-cases\/(.*)$/,
        replacement: path.resolve(repoRoot, 'packages/riviere-extract-ts/use-cases/src/$1'),
      },
    ],
  },
  test: {
    name: '@living-architecture/riviere-cli',
    watch: false,
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    include: [
      'apps/cli/{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/riviere-builder/use-cases/src/**/*.{test,spec}.{ts,mts}',
      'packages/riviere-extract-ts/use-cases/src/**/*.{test,spec}.{ts,mts}',
    ],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reportsDirectory: 'apps/cli/test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as ['text', ['lcov', { projectRoot: string }]],
      include: [
        'apps/cli/src/**/*.ts',
        'packages/riviere-builder/use-cases/src/**/*.ts',
        'packages/riviere-extract-ts/use-cases/src/**/*.ts',
      ],
      exclude: [
        '**/*.spec.ts',
        '**/__fixtures__/**',
        '**/*-input.ts',
        '**/*-result.ts',
        '**/*test-fixtures.ts',
        '**/index.ts',
        'apps/cli/src/features/role-enforcement/entrypoint/role-enforcement/entrypoint.ts',
        'apps/cli/src/shell/bin.ts',
        'apps/cli/src/shell/index.ts',
        'apps/cli/src/shell/role-enforcement-bin.ts',
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
