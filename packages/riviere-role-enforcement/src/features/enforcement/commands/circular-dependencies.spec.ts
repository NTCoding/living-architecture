import assert from 'node:assert/strict'
import { it } from 'vitest'
import { role, roleEnforcement } from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const moduleFunction = role('module-function', { targets: ['function'] })

it('rejects circular imports', () => {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-circular-imports-',
      roles: [moduleFunction],
      files: {
        'packages/pkg-a/src/first.ts': `import { second } from './second'

/** @riviere-role module-function */
export function first(): string {
  return second()
}
`,
        'packages/pkg-a/src/second.ts': `import { first } from './first'

/** @riviere-role module-function */
export function second(): string {
  return first()
}
`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: {
          config: roleEnforcement({
            packages: ['packages/pkg-a'],
            ignorePatterns: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [moduleFunction],
            locations: {
              source: {
                path: 'src',
                allowAnySubLocations: true,
                rules: { roles: ['module-function'] },
              },
            },
          }),
        },
      })

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Dependency cycle detected/)
    },
  )
})
