import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

it("a sub-location inherits its parent location's allowed imports", () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: {
        importRules: { allow: { sibling: ['data-access'] } },
      },
      'data-access': [],
      importRules: { allow: { root: ['infra'] } },
    }),
    location<never>('/infra', { cli: [] }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../infra/cli/shared'\n`,
      'packages/pkg-a/src/infra/cli/shared.ts': `void 'shared'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it("a sub-location can stop inheriting its parent location's allowed imports", () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: {
        importRules: {
          allow: { sibling: ['data-access'] },
          inheritParentImportRules: false,
        },
      },
      'data-access': [],
      importRules: { allow: { root: ['infra'] } },
    }),
    location<never>('/infra', { cli: [] }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../infra/cli/shared'\n`,
      'packages/pkg-a/src/infra/cli/shared.ts': `void 'shared'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/cli'/)
    },
  )
})

it('an allowed location can be limited to selected roles', () => {
  const roles = [
    role('repository', { targets: ['class'] }),
    role('aggregate', { targets: ['class'] }),
    role('value-object', { targets: ['class'] }),
    role('domain-service', { targets: ['function'] }),
  ] as const
  const locations = locationConfiguration(
    location<(typeof roles)[number]['name']>('/features/{feature}', {
      'data-access/{concept}': {
        roles: ['repository'],
        importRules: {
          allow: {
            sibling: [{ domain: ['aggregate', 'value-object'] }],
          },
        },
      },
      domain: {
        roles: ['aggregate', 'value-object', 'domain-service'],
        allowAnySubLocations: true,
      },
    }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-selected-location-roles-',
      roles,
      files: {
        'packages/pkg-a/src/features/orders/domain/resolve.ts': `/** @riviere-role domain-service */
export function resolve(): string {
  return 'resolved'
}
`,
        'packages/pkg-a/src/features/orders/data-access/orders/repository.ts': `import { resolve } from '../../domain/resolve'

/** @riviere-role repository */
export class Repository {
  load(): string {
    return resolve()
  }
}
`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: { 'packages/pkg-a': { locations } },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles,
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/domain'/)
    },
  )
})

it("a file directly inside a location obeys that location's import rules", () => {
  const locations = locationConfiguration<never>(
    location<never>('/first', {
      nested: [],
      importRules: { allow: {} },
    }),
    location<never>('/second', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/first/source.ts': `import '../second/target'\n`,
      'packages/pkg-a/src/second/target.ts': `void 'target'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/second'/)
    },
  )
})

type FixtureResult = { exitCode: number; stderr: string; stdout: string }

function runFixture(
  locations: ReturnType<typeof locationConfiguration<never>>,
  files: Readonly<Record<string, string>>,
  assertResult: (result: FixtureResult) => void,
): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-location-imports-',
      roles: [],
      files: { '.riviere/role-definitions/.gitkeep': '', ...files },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: { 'packages/pkg-a': { locations } },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles: [],
        }),
        workspaceDir,
      )
      assertResult(result)
    },
  )
}
