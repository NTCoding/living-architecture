import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement'
import {
  createTestRoleEnforcementApplication,
  withWorkspaceFixture,
} from './test-fixture-workspace'

const fieldNameRole = role('field-name', {
  requiresStringLiteralConstant: true,
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<'field-name'>('/published-language', ['field-name']),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [fieldNameRole],
})

function runWith(source: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-variable-',
      roles: [fieldNameRole],
      files: {
        'packages/pkg-a/src/published-language/field-name.ts': source,
      },
    },
    (workspaceDir) =>
      createTestRoleEnforcementApplication().execute({
        configDir: workspaceDir,
        configModule: { config },
      }),
  )
}

it('allows a published field name declared as a string-literal constant', () => {
  const result = runWith(`/** @riviere-role field-name */
export const EVENT_NAME_FIELD = 'eventName' as const
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a mutable published field name', () => {
  const result = runWith(`/** @riviere-role field-name */
export let EVENT_NAME_FIELD = 'eventName'
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'field-name' requires a string-literal constant")
})

it('rejects a computed published field name', () => {
  const result = runWith(`/** @riviere-role field-name */
export const EVENT_NAME_FIELD = String('eventName')
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'field-name' requires a string-literal constant")
})

it('requires an exported variable to declare its role', () => {
  const result = runWith(`export const EVENT_NAME_FIELD = 'eventName' as const
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Missing @riviere-role annotation for 'EVENT_NAME_FIELD'")
})
