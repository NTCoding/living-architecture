import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
  type LocationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

const baseLocations = locationConfiguration<never>(
  location<never>('/first', { alpha: [], beta: [], gamma: [] }),
  location<never>('/second', { alpha: [], beta: [], gamma: [] }),
)

it('allows no roles when a location has no permitted roles', () => {
  const roles = [role('role-a', { targets: ['function'] })] as const

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-empty-location-roles-',
      roles,
      files: {
        'packages/pkg-a/src/infra/source.ts': `/** @riviere-role role-a */
export function source(): string {
  return 'source'
}
`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: {
            'packages/pkg-a': {
              locations: locationConfiguration(location<'role-a'>('/infra', [])),
            },
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles,
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /role-a cannot live in packages\/pkg-a\/src\/infra\/source.ts/)
    },
  )
})

it('a sub-location does not use roles permitted by its parent location', () => {
  const roles = [role('role-a', { targets: ['function'] })] as const
  const locations = locationConfiguration(
    location<'role-a'>('/entrypoint', {
      _platform: {
        roles: ['role-a'],
        cli: [],
      },
    }),
  )

  runRoleFixture(
    roles,
    locations,
    {
      'packages/pkg-a/src/entrypoint/_platform/cli/input.ts': `/** @riviere-role role-a */
export function input(): string {
  return 'input'
}
`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /role-a cannot live/)
    },
  )
})

it('allows imports between locations by default', () => {
  runFixture(
    baseLocations,
    {
      'packages/pkg-a/src/first/alpha/source.ts': `import '../../second/gamma/target'\n`,
      'packages/pkg-a/src/second/gamma/target.ts': `void 'target'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('applies declared import rules between different location instances', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: [],
      domain: [],
      importRules: { allow: { root: ['infra'] } },
    }),
    location<never>('/infra', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../payments/domain/payment'\n`,
      'packages/pkg-a/src/features/payments/domain/payment.ts': `void 'payment'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/domain'/)
    },
  )
})

it('allows only the named sibling location after import rules are declared', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: {
        importRules: { allow: { sibling: ['data-access'] } },
      },
      'data-access': [],
      entrypoint: [],
    }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../data-access/repository'\nimport '../entrypoint/handler'\n`,
      'packages/pkg-a/src/features/orders/data-access/repository.ts': `void 'repository'\n`,
      'packages/pkg-a/src/features/orders/entrypoint/handler.ts': `void 'handler'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/entrypoint'/)
    },
  )
})

it('a root import includes every sub-location below that root', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      entrypoint: { importRules: { allow: { root: ['infra'] } } },
    }),
    location<never>('/infra', {
      'cli/input': [],
      'cli/presentation': [],
    }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/entrypoint/handler.ts': `import '../../../infra/cli/input/parser'\nimport '../../../infra/cli/presentation/output'\n`,
      'packages/pkg-a/src/infra/cli/input/parser.ts': `void 'parser'\n`,
      'packages/pkg-a/src/infra/cli/presentation/output.ts': `void 'output'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('inherits import restrictions in every sub-location', () => {
  const locations = locationConfiguration<never>(
    location<never>('/domain', []),
    location<never>('/infra', {
      'external-clients/{client}': [],
      importRules: { allow: {} },
    }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/domain/model.ts': `void 'domain'\n`,
      'packages/pkg-a/src/infra/external-clients/http/client.tsx': `import '../../../domain/model'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/domain'/)
    },
  )
})

it('allows imports within a restricted location', () => {
  const locations = locationConfiguration<never>(
    location<never>('/infra', {
      cli: [],
      'external-clients': [],
      importRules: { allow: {} },
    }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/infra/cli/output.ts': `import '../external-clients/client'\n`,
      'packages/pkg-a/src/infra/external-clients/client.ts': `void 'client'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('rejects folders that are not configured sub-locations', () => {
  runFixture(
    baseLocations,
    { 'packages/pkg-a/src/first/unconfigured/file.ts': `void 'invalid folder'\n` },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Unconfigured sub-location 'unconfigured'/)
    },
  )
})

it('rejects source folders that are not configured locations', () => {
  runFixture(
    locationConfiguration<never>(location<never>('/domain', [])),
    { 'packages/pkg-a/src/other/file.ts': `void 'invalid location'\n` },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Unconfigured sub-location 'other' inside location '\/'/)
    },
  )
})

it('allows any folder when allowAnySubLocations is enabled', () => {
  runFixture(
    locationConfiguration<never>(location<never>('/domain', [], { allowAnySubLocations: true })),
    { 'packages/pkg-a/src/domain/connection-detection/deep/file.ts': `void 'domain'\n` },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('rejects combining allowAnySubLocations with explicit sub-locations', () => {
  assert.throws(
    () => location<never>('/domain', { invalid: [], allowAnySubLocations: true }),
    /cannot define both allowAnySubLocations and subLocations/,
  )
})

it('allows a private location to be imported from within its parent location', () => {
  runFixture(
    privateLocationConfiguration(),
    {
      'packages/pkg-a/src/entrypoint/_platform/shared.ts': `void 'shared'\n`,
      'packages/pkg-a/src/entrypoint/http/handler.ts': `import '../_platform/shared'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('rejects importing a private location from outside its parent location', () => {
  runFixture(
    privateLocationConfiguration(),
    {
      'packages/pkg-a/src/entrypoint/_platform/shared.ts': `void 'shared'\n`,
      'packages/pkg-a/src/commands/run.ts': `import '../entrypoint/_platform/shared'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /can only be imported from within its parent location/)
    },
  )
})

function privateLocationConfiguration(): LocationConfiguration<never> {
  return locationConfiguration<never>(
    location<never>('/commands', []),
    location<never>('/entrypoint', {
      _platform: { importRules: { importableFrom: 'withinParentLocation' } },
      http: [],
    }),
  )
}

type FixtureResult = { exitCode: number; stderr: string; stdout: string }

function runRoleFixture<R extends string>(
  roles: readonly ReturnType<typeof role<R>>[],
  locations: LocationConfiguration<R>,
  files: Readonly<Record<string, string>>,
  assertResult: (result: FixtureResult) => void,
): void {
  fixtureWorkspace.withWorkspaceFixture(
    { prefix: 'role-enforcement-location-roles-', roles, files },
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
      assertResult(result)
    },
  )
}

function runFixture(
  locations: LocationConfiguration<never>,
  files: Readonly<Record<string, string>>,
  assertResult: (result: FixtureResult) => void,
): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-location-hierarchy-',
      roles: [],
      files: { '.riviere/role-definitions/.gitkeep': '', ...files },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(createConfig(locations), workspaceDir)
      assertResult(result)
    },
  )
}

function createConfig(locations: LocationConfiguration<never>) {
  return roleEnforcementConfiguration({
    configurations: { 'packages/pkg-a': { locations } },
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [],
  })
}
