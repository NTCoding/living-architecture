import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcement,
  type LocationConfiguration,
} from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const baseLocations = locationConfiguration(
  location<never>('src')
    .subLocation('/first', [])
    .subLocation('/first/alpha', [])
    .subLocation('/first/beta', [])
    .subLocation('/first/gamma', [])
    .subLocation('/second', [])
    .subLocation('/second/alpha', [])
    .subLocation('/second/beta', [])
    .subLocation('/second/gamma', []),
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
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcement({
            configurations: {
              test: {
                packages: ['packages/pkg-a'],
                locations: locationConfiguration(location('src').subLocation('/infra', [])),
              },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles,
          }),
        },
      })

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /role-a cannot live in packages\/pkg-a\/src\/infra\/source.ts/)
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
    (result) => {
      assert.equal(result.exitCode, 0)
      assert.equal(result.stderr, '')
    },
  )
})

it('prevents sibling location instances importing one another', () => {
  const locations = locationConfiguration(
    location<never>('src/features/{feature}', { dependencyRules: { canImportSiblings: false } })
      .subLocation('/commands', [])
      .subLocation('/domain', []),
    location<never>('src/platform').subLocation('/domain', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../payments/domain/payment'\n`,
      'packages/pkg-a/src/features/payments/domain/payment.ts': `void 'payment'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import sibling location instance/)
    },
  )
})

it('allows a location with sibling restrictions to import platform', () => {
  const locations = locationConfiguration(
    location<never>('src/features/{feature}', {dependencyRules: { canImportSiblings: false },}).subLocation('/commands', []),
    location<never>('src/platform').subLocation('/domain', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../platform/domain/shared'\n`,
      'packages/pkg-a/src/platform/domain/shared.ts': `void 'shared'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 0)
    },
  )
})

it('inherits location restrictions in every sub-location', () => {
  const locations = locationConfiguration(
    location<never>('src')
      .subLocation('/domain', [])
      .subLocation('/infra', [], { dependencyRules: { locations: [] } })
      .subLocation('/infra/external-clients', [])
      .subLocation('/infra/external-clients/{client}', []),
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
  const locations = locationConfiguration(
    location<never>('src')
      .subLocation('/infra', [], { dependencyRules: { locations: [] } })
      .subLocation('/infra/cli', [])
      .subLocation('/infra/external-clients', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/infra/cli/output.ts': `import '../external-clients/client'\n`,
      'packages/pkg-a/src/infra/external-clients/client.ts': `void 'client'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 0)
    },
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

it('allows any folder when allowAnySubLocations is enabled', () => {
  const locations = locationConfiguration(
    location<never>('src').subLocation('/domain', [], { allowAnySubLocations: true }),
  )

  runFixture(
    locations,
    { 'packages/pkg-a/src/domain/connection-detection/deep/file.ts': `void 'domain'\n` },
    (result) => {
      assert.equal(result.exitCode, 0)
    },
  )
})

it('rejects combining allowAnySubLocations with explicit sub-locations', () => {
  assert.throws(() => {
    location<never>('src', { allowAnySubLocations: true }).subLocation('/invalid', [])
  }, /cannot define both allowAnySubLocations and subLocations/)

  assert.throws(() => {
    location<never>('src')
      .subLocation('/domain', [], { allowAnySubLocations: true })
      .subLocation('/domain/invalid', [])
  }, /cannot define both allowAnySubLocations and subLocations/)
})

it('allows a location to be imported from within its parent location', () => {
  const locations = privateLocationConfiguration()

  runFixture(
    locations,
    {
      'packages/pkg-a/src/entrypoint/_platform/shared.ts': `void 'shared'\n`,
      'packages/pkg-a/src/entrypoint/http/handler.ts': `import '../_platform/shared'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 0)
    },
  )
})

it('rejects importing a location from outside its parent location', () => {
  const locations = privateLocationConfiguration()

  runFixture(
    locations,
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
  return locationConfiguration(
    location<never>('src')
      .subLocation('/commands', [])
      .subLocation('/entrypoint', [])
      .subLocation('/entrypoint/_platform', [], {dependencyRules: { importableFrom: 'withinParentLocation' },})
      .subLocation('/entrypoint/http', []),
  )
}

type FixtureResult = {
  exitCode: number
  stderr: string
  stdout: string
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
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        ...files,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: { config: createConfig(locations) },
      })
      assertResult(result)
    },
  )
}

function createConfig(locations: LocationConfiguration<never>) {
  return roleEnforcement({
    configurations: {
      test: {
        packages: ['packages/pkg-a'],
        locations,
      },
    },
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [],
  })
}
