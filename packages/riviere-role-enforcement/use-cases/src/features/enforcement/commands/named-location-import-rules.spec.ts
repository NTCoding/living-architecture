import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  roleEnforcementConfiguration,
  type LocationConfiguration,
} from '@living-architecture/riviere-role-enforcement'
import * as fixtureWorkspace from './test-fixture-workspace'

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

it("an own-subdomain import allows a location in the subdomain's domain model", () => {
  const useCaseLocations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: { importRules: { allow: { ownSubdomain: ['domain'] } } },
    }),
  )
  const domainModelLocations = locationConfiguration<never>(
    location<never>('/domain', { allowAnySubLocations: true }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-own-subdomain-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'packages/orders/use-cases/src/features/checkout/commands/run.ts': `import '../../../../domain-model/src/domain/order'\n`,
        'packages/orders/domain-model/src/domain/order.ts': `void 'order'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: {
              'packages/orders/use-cases': { locations: useCaseLocations },
              'packages/orders/domain-model': { locations: domainModelLocations },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })

      assert.equal(result.exitCode, 0, result.stdout)
    },
  )
})

it("a location can import another subdomain's published language when allowed", () => {
  const useCaseLocations = locationConfiguration<never>(
    location<never>('/features/{feature}', {
      commands: {
        importRules: { allow: { otherSubdomain: ['published-language'] } },
      },
    }),
  )
  const publishedLanguageLocations = locationConfiguration<never>(
    location<never>('/published-language', { allowAnySubLocations: true }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-other-subdomain-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'packages/orders/use-cases/src/features/checkout/commands/run.ts': `import '../../../../../../graph/published-language/src/published-language/schema'\n`,
        'packages/graph/published-language/src/published-language/schema.ts': `void 'schema'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: {
              'packages/orders/use-cases': { locations: useCaseLocations },
              'packages/graph/published-language': { locations: publishedLanguageLocations },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })

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
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations,
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })
      assertResult(result)
    },
  )
}
