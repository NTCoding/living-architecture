import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  roleEnforcementConfiguration,
  type LocationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

it('a sibling import includes every sub-location below that sibling', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: { importRules: { allow: { sibling: ['data-access'] } } },
      'data-access/{concept}': [],
    }),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../data-access/orders/repository'\n`,
      'packages/pkg-a/src/features/orders/data-access/orders/repository.ts': `void 'repository'\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('a sibling import does not allow a root location with the same name', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: { importRules: { allow: { sibling: ['data-access'] } } },
      'data-access/{concept}': [],
    }),
    location<never>('/data-access/{concept}', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../data-access/orders/repository'\n`,
      'packages/pkg-a/src/data-access/orders/repository.ts': `void 'repository'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/data-access\/\{concept\}'/)
    },
  )
})

it('a root import does not allow another package with the same root location', () => {
  const locations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: { importRules: { allow: { root: ['data-access'] } } },
    }),
    location<never>('/data-access/{concept}', []),
  )

  runFixture(
    locations,
    {
      'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../../../pkg-b/src/data-access/orders/repository'\n`,
      'packages/pkg-b/src/data-access/orders/repository.ts': `void 'repository'\n`,
    },
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /cannot import location '\/data-access\/\{concept\}'/)
    },
    ['packages/pkg-a', 'packages/pkg-b'],
  )
})

it("an own-subdomain import allows a named location in the subdomain's other package", () => {
  const consumerLocations = locationConfiguration<never>(
    location<never>('/actions', {
      importRules: { allow: { ownSubdomain: ['api'] } },
    }),
  )
  const providerLocations = locationConfiguration<never>(
    location<never>('/api', { allowAnySubLocations: true }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-own-subdomain-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'modules/alpha/consumer/src/actions/run.ts': `import '../../../provider/src/api/value'\n`,
        'modules/alpha/provider/src/api/value.ts': `void 'value'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: {
            'modules/{subdomain}/consumer': { locations: consumerLocations },
            'modules/{subdomain}/provider': { locations: providerLocations },
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles: [],
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 0, result.stdout)
    },
  )
})

it("an any-subdomain import allows another subdomain's named location", () => {
  const consumerLocations = locationConfiguration<never>(
    location<never>('/actions', {
      importRules: { allow: { anySubdomain: ['contract'] } },
    }),
  )
  const exporterLocations = locationConfiguration<never>(
    location<never>('/contract', { allowAnySubLocations: true }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-any-subdomain-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'modules/alpha/consumer/src/actions/run.ts': `import '../../../../beta/exporter/src/contract/schema'\n`,
        'modules/beta/exporter/src/contract/schema.ts': `void 'schema'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: {
            'modules/{subdomain}/consumer': { locations: consumerLocations },
            'modules/{subdomain}/exporter': { locations: exporterLocations },
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles: [],
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 0, result.stdout)
    },
  )
})

it('an any-subdomain import allows the named location in a different package group', () => {
  const interfaceLocations = locationConfiguration<never>(
    location<never>('/entry', {
      importRules: { allow: { anySubdomain: ['actions'] } },
    }),
  )
  const consumerLocations = locationConfiguration<never>(
    location<never>('/actions', { allowAnySubLocations: true }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-any-subdomain-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'interfaces/cli/src/entry/run.ts': `import '../../../../modules/alpha/consumer/src/actions/run'\n`,
        'modules/alpha/consumer/src/actions/run.ts': `void 'run'\n`,
      },
    },
    (workspaceDir) => {
      const interfacePackage = { locations: interfaceLocations }
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: {
            'interfaces/': interfacePackage,
            'modules/{subdomain}/consumer': { locations: consumerLocations },
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles: [],
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 0, result.stdout)
    },
  )
})

type FixtureResult = { exitCode: number; stderr: string; stdout: string }

function runFixture(
  locations: LocationConfiguration<never>,
  files: Readonly<Record<string, string>>,
  assertResult: (result: FixtureResult) => void,
  packagePaths: readonly string[] = ['packages/pkg-a'],
): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-named-location-import-',
      roles: [],
      files: { '.riviere/role-definitions/.gitkeep': '', ...files },
    },
    (workspaceDir) => {
      const configurations = Object.fromEntries(
        packagePaths.map((packagePath) => [packagePath, { locations }]),
      )
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations,
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
