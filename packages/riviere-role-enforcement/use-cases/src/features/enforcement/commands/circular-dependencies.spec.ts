import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

const moduleFunction = role('module-function', { targets: ['function'] })

it('rejects circular imports', () => {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-circular-imports-',
      roles: [moduleFunction],
      files: {
        'packages/pkg-a/src/domain/first.ts': `import { second } from './second'

/** @riviere-role module-function */
export function first(): string {
  return second()
}
`,
        'packages/pkg-a/src/domain/second.ts': `import { first } from './first'

/** @riviere-role module-function */
export function second(): string {
  return first()
}
`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        roleEnforcementConfiguration({
          configurations: {
            'packages/pkg-a': {
              locations: locationConfiguration(
                location('/domain', ['module-function'], { allowAnySubLocations: true }),
              ),
            },
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles: [moduleFunction],
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Dependency cycle detected/)
    },
  )
})
