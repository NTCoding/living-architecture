import path from 'node:path'
import { defineConfig } from 'vitest/config'

const repoRoot = path.resolve(__dirname, '../../..')

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/riviere-role-enforcement-plugin',
  test: {
    name: '@living-architecture/riviere-role-enforcement-plugin',
    watch: false,
    globals: true,
    environment: 'node',
    include: [
      'src/domain/role-enforcement-plugin.spec.ts',
      'src/domain/role-enforcement-plugin-forbidden-supertypes.spec.ts',
      'src/domain/role-enforcement-plugin-aggregate-repository.spec.ts',
    ],
    coverage: {
      enabled: true,
      include: ['role-enforcement-plugin.mjs'],
      reportsDirectory: './test-output/vitest/plugin-coverage',
      provider: 'v8' as const,
      reporter: ['text', ['lcov', { projectRoot: repoRoot }]] as [
        'text',
        ['lcov', { projectRoot: string }],
      ],
    },
  },
}))
