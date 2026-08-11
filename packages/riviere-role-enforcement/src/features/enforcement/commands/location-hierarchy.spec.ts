import assert from 'node:assert/strict'
import { it } from 'vitest'
import { roleEnforcement, type LocationStructure } from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const baseLocations = {
  source: {
    path: 'src',
    subLocations: {
      first: {
        subLocations: {
          alpha: {},
          beta: {},
          gamma: {},
        },
      },
      second: {
        subLocations: {
          alpha: {},
          beta: {},
          gamma: {},
        },
      },
    },
  },
} satisfies LocationStructure<never>

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
  const locations = {
    source: {
      path: 'src',
      subLocations: {
        features: {
          subLocations: {
            '{feature}': {
              rules: { dependencyRules: { canImportSiblings: false } },
              subLocations: {
                commands: {},
                domain: {},
              },
            },
          },
        },
        platform: { subLocations: { domain: {} } },
      },
    },
  } satisfies LocationStructure<never>

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
  const locations = {
    source: {
      path: 'src',
      subLocations: {
        features: {
          subLocations: {
            '{feature}': {
              rules: { dependencyRules: { canImportSiblings: false } },
              subLocations: { commands: {} },
            },
          },
        },
        platform: { subLocations: { domain: {} } },
      },
    },
  } satisfies LocationStructure<never>

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
  const locations = {
    source: {
      path: 'src',
      subLocations: {
        domain: {},
        infra: {
          rules: { dependencyRules: { locations: [] } },
          subLocations: { 'external-clients': { subLocations: { '{client}': {} } } },
        },
      },
    },
  } satisfies LocationStructure<never>

  runFixture(
    locations,
    {
      'packages/pkg-a/src/domain/model.ts': `void 'domain'\n`,
      'packages/pkg-a/src/infra/external-clients/http/client.tsx': `import '../../../domain/model'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location 'domain'/)
    },
  )
})

it('allows imports within a restricted location', () => {
  const locations = {
    source: {
      path: 'src',
      subLocations: {
        infra: {
          rules: { dependencyRules: { locations: [] } },
          subLocations: {
            cli: {},
            'external-clients': {},
          },
        },
      },
    },
  } satisfies LocationStructure<never>

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
  const locations = {
    source: {
      path: 'src',
      subLocations: { domain: { allowAnySubLocations: true } },
    },
  } satisfies LocationStructure<never>

  runFixture(
    locations,
    { 'packages/pkg-a/src/domain/connection-detection/deep/file.ts': `void 'domain'\n` },
    (result) => {
      assert.equal(result.exitCode, 0)
    },
  )
})

it('rejects combining allowAnySubLocations with explicit sub-locations', () => {
  const invalidLocations = {
    source: {
      path: 'src',
      allowAnySubLocations: true,
      subLocations: { invalid: {} },
    },
  }

  assert.throws(() => {
    // @ts-expect-error The runtime guard protects JavaScript configuration files too.
    createConfig(invalidLocations)
  }, /cannot define both allowAnySubLocations and subLocations/)
})

it('allows a location to be imported from within its parent location', () => {
  const locations = privateLocationStructure()

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
  const locations = privateLocationStructure()

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

function privateLocationStructure(): LocationStructure<never> {
  return {
    source: {
      path: 'src',
      subLocations: {
        commands: {},
        entrypoint: {
          subLocations: {
            _platform: { rules: { dependencyRules: { importableFrom: 'withinParentLocation' } } },
            http: {},
          },
        },
      },
    },
  }
}

type FixtureResult = {
  exitCode: number
  stderr: string
  stdout: string
}

function runFixture(
  locations: LocationStructure<never>,
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

function createConfig(locations: LocationStructure<never>) {
  return roleEnforcement({
    packages: ['packages/pkg-a'],
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [],
    locations,
  })
}
