import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { runTestRoleEnforcement, withWorkspaceFixture } from './__fixtures__/test-fixture-workspace'

const roles = [
  role('consumer', { targets: ['type-alias'] }),
  role('provider', { targets: ['type-alias'] }),
] as const

function createConfig(ignorePatterns: readonly string[] = []) {
  return roleEnforcementConfiguration({
    configurations: {
      'packages/pkg-a': {
        locations: locationConfiguration(
          location<(typeof roles)[number]['name']>('/source', ['consumer'], {
            importRules: { allow: {} },
          }),
          location<(typeof roles)[number]['name']>('/target', ['provider']),
        ),
      },
    },
    ignorePatterns,
    roleDefinitionsDir: '.riviere/role-definitions',
    roles,
  })
}

const config = createConfig()

function runWith(source: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-dependency-syntax-',
      roles,
      files: {
        'packages/pkg-a/src/source/source.ts': source,
        'packages/pkg-a/src/target/target.ts': `/** @riviere-role provider */
export type Target = { value: string }
`,
      },
    },
    (workspaceDir) => runTestRoleEnforcement(config, workspaceDir),
  )
}

it.each([
  ['a named re-export', `export type { Target } from '../target/target'\n`],
  ['a wildcard re-export', `export * from '../target/target'\n`],
  ['a dynamic import', `void import('../target/target')\n`],
  ['a CommonJS require', `require('../target/target')\n`],
  [
    'a TypeScript import type',
    `/** @riviere-role consumer */
export type Source = import('../target/target').Target
`,
  ],
])('checks %s against location import rules', (_description, source) => {
  const result = runWith(source)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Location '/source' cannot import location '/target'.")
})

it.each([
  ['dynamic import', `const target = '../target/target'\nvoid import(target)\n`],
  ['CommonJS require', `const target = '../target/target'\nrequire(target)\n`],
])('rejects a non-literal %s target', (_description, source) => {
  const result = runWith(source)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    'Dependency target must be a string literal so its location can be checked.',
  )
})

it('rejects a production import from an ignored fixture', () => {
  const result = withWorkspaceFixture(
    {
      prefix: 'role-enforcement-ignored-fixture-',
      roles,
      files: {
        'packages/pkg-a/src/source/source.ts': `import type { Fixture } from './__fixtures__/fixture'

/** @riviere-role consumer */
export type Source = Fixture
`,
        'packages/pkg-a/src/source/__fixtures__/fixture.ts': `export type Fixture = { value: string }
`,
      },
    },
    (workspaceDir) => runTestRoleEnforcement(createConfig(['**/__fixtures__/**']), workspaceDir),
  )

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('Production code cannot import ignored file')
})
