import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

it('importing a location allows imports from its sub-locations', () => {
  const locations = locationConfiguration(
    location<never>('/features/{feature}')
      .subLocation('/commands', [], {
        dependencyRules: { locations: [{ location: '/data-access' }] },
      })
      .subLocation('/data-access/{concept}', []),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-location-sub-location-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'packages/pkg-a/src/features/orders/commands/run.ts': `import '../data-access/orders/repository'\n`,
        'packages/pkg-a/src/features/orders/data-access/orders/repository.ts': `void 'repository'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: { test: { packages: ['packages/pkg-a'], locations } },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })

      assert.equal(result.exitCode, 0, result.stdout)
      assert.equal(result.stderr, '')
    },
  )
})

it('a double-star location can refer to a location in another package', () => {
  const locations = locationConfiguration(
    location<never>('/domain', [], {
      dependencyRules: { locations: [{ location: '**/published-language' }] },
    }),
    location<never>('/published-language', []),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-cross-package-location-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'packages/domain-model/src/domain/model.ts': `import '../../../published-language/src/published-language/schema'\n`,
        'packages/published-language/src/published-language/schema.ts': `void 'schema'\n`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: {
              test: {
                packages: ['packages/domain-model', 'packages/published-language'],
                locations,
              },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })
      assert.equal(result.exitCode, 0, result.stdout)
      assert.equal(result.stderr, '')
    },
  )
})

it('a restricted nested location needs permission to import a package-level location', () => {
  const restrictedLocations = locationConfiguration(
    location<never>('/features/{feature}')
      .subLocation('/commands', [], {
        dependencyRules: { locations: [{ location: '/domain' }] },
      })
      .subLocation('/domain', []),
    location<never>('/data-access/{concept}', []),
  )
  const permittedLocations = locationConfiguration(
    location<never>('/features/{feature}')
      .subLocation('/commands', [], {
        dependencyRules: {
          locations: [{ location: '/domain' }, { location: '**/data-access' }],
        },
      })
      .subLocation('/domain', []),
    location<never>('/data-access/{concept}', []),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-package-level-location-import-',
      roles: [],
      files: {
        '.riviere/role-definitions/.gitkeep': '',
        'packages/pkg-a/src/features/orders/commands/run.ts': `import '../../../data-access/orders/repository'\n`,
        'packages/pkg-a/src/data-access/orders/repository.ts': `void 'repository'\n`,
      },
    },
    (workspaceDir) => {
      const application = fixtureWorkspace.createTestRoleEnforcementApplication()
      const restrictedResult = application.execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: {
              test: { packages: ['packages/pkg-a'], locations: restrictedLocations },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })
      const permittedResult = application.execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: {
              test: { packages: ['packages/pkg-a'], locations: permittedLocations },
            },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          }),
        },
      })

      assert.equal(restrictedResult.exitCode, 1)
      assert.match(
        restrictedResult.stdout,
        /Location '\/commands' cannot import location '\/data-access\/\{concept\}'/,
      )
      assert.equal(permittedResult.exitCode, 0, permittedResult.stdout)
      assert.equal(permittedResult.stderr, '')
    },
  )
})

it('a location import can be limited to selected roles', () => {
  const roles = [
    role('repository', { targets: ['class'] }),
    role('aggregate', { targets: ['class'] }),
    role('value-object', { targets: ['class'] }),
    role('domain-service', { targets: ['function'] }),
  ] as const
  const locations = locationConfiguration(
    location<(typeof roles)[number]['name']>('/features/{feature}')
      .subLocation('/data-access/{concept}', ['repository'], {
        dependencyRules: {
          locations: [{ location: '/domain', roles: ['aggregate', 'value-object'] }],
        },
      })
      .subLocation('/domain', ['aggregate', 'value-object', 'domain-service'], {
        allowAnySubLocations: true,
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
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcementConfiguration({
            configurations: { test: { packages: ['packages/pkg-a'], locations } },
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles,
          }),
        },
      })

      assert.equal(result.exitCode, 1)
      assert.match(
        result.stdout,
        /Location '\/data-access\/{concept}' cannot import location '\/domain'/,
      )
    },
  )
})
