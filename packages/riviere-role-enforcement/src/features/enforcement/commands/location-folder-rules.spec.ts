import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

it('a file cannot satisfy a required sub-location', () => {
  const roles = [role('repository', { targets: ['class'] })] as const
  const locations = locationConfiguration(
    location<(typeof roles)[number]['name']>('/features/{feature}').subLocation(
      '/data-access/{concept}',
      ['repository'],
    ),
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
      assert.match(result.stdout, /Unconfigured sub-location 'data-access'/)
    },
  )
})
