import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { runTestRoleEnforcement, withWorkspaceFixture } from './__fixtures__/test-fixture-workspace'

const enumerationRole = role('enumeration', {
  targets: ['variable'],
})
const otherEnumerationRole = role('other-enumeration', {
  targets: ['variable'],
})
const enumerationTypeRole = role('enumeration-type', {
  targets: ['type-alias'],
  requiresIndexedAccessTypeFromRole: 'enumeration',
})

const config = RoleEnforcementConfiguration.parse({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<'enumeration' | 'enumeration-type' | 'other-enumeration'>('/published-language', [
          'enumeration',
          'enumeration-type',
          'other-enumeration',
        ]),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [enumerationRole, enumerationTypeRole, otherEnumerationRole],
})

function runWith(source: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-enumeration-type-',
      roles: [enumerationRole, enumerationTypeRole, otherEnumerationRole],
      files: {
        'packages/pkg-a/src/published-language/types.ts': source,
      },
    },
    (workspaceDir) => runTestRoleEnforcement(config, workspaceDir),
  )
}

it('allows a type derived from a published runtime enumeration', () => {
  const result = runWith(`/** @riviere-role enumeration */
export const TYPES = ['api', 'ui'] as const

/** @riviere-role enumeration-type */
export type Type = (typeof TYPES)[number]
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a type derived from a variable with the wrong role', () => {
  const result = runWith(`/** @riviere-role other-enumeration */
export const TYPES = ['api', 'ui'] as const

/** @riviere-role enumeration-type */
export type Type = (typeof TYPES)[number]
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "requires an indexed access type derived from role 'enumeration' on 'Type'",
  )
})
