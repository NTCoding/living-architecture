import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import {
  runTestRoleEnforcement,
  withWorkspaceFixture,
  writeFixtureFile,
} from './__fixtures__/test-fixture-workspace'

const testRoles = [
  role('cli-entrypoint', {
    targets: ['function'],
    forbiddenDependencies: ['cli-entrypoint'],
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

const testConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(location<TestRoleName>('/entrypoint', ['cli-entrypoint'])),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
})

it('rejects an entrypoint importing another entrypoint', () => {
  withWorkspaceFixture(
    {
      prefix: 'forbidden-entrypoint-dependencies-',
      roles: testRoles,
      files: {
        'packages/pkg-a/src/entrypoint/helper.ts': `/** @riviere-role cli-entrypoint */
export function createHelper(): string {
  return 'helper'
}
`,
      },
    },
    (workspaceDir) => {
      writeFixtureFile(
        workspaceDir,
        'packages/pkg-a/src/entrypoint/entrypoint.ts',
        `import { createHelper } from './helper'

/** @riviere-role cli-entrypoint */
export function createCommand(): string {
  return createHelper()
}
`,
      )

      const result = runTestRoleEnforcement(testConfig, workspaceDir)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain(
        "Forbidden dependency: this file (cli-entrypoint) cannot import from a file exporting 'cli-entrypoint'",
      )
      expect(result.stdout).toContain('**IMPORTANT: Role check has failed.')
    },
  )
})
