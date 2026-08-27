import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

it('a file cannot satisfy a required sub-location', () => {
  const roles = [role('repository', { targets: ['class'] })] as const
  const locations = locationConfiguration(
    location<(typeof roles)[number]['name']>('/features/{feature}', {
      'data-access/{concept}': ['repository'],
    }),
  )

  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-required-sub-location-',
      roles,
      files: {
        'packages/pkg-a/src/features/orders/data-access/repository.ts': `/** @riviere-role repository */
export class Repository {}
`,
      },
    },
    (workspaceDir) => {
      const result = fixtureWorkspace.runTestRoleEnforcement(
        RoleEnforcementConfiguration.parse({
          configurations: { 'packages/pkg-a': { locations } },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles,
        }),
        workspaceDir,
      )

      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Unconfigured sub-location 'data-access'/)
    },
  )
})
