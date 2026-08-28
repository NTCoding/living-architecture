import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import { runTestRoleEnforcement, withWorkspaceFixture } from './__fixtures__/test-fixture-workspace'

const dataStructureRole = role('data-structure', {
  mustBeDataStructure: true,
})
const unionRole = role('union', {
  requiresUnion: true,
})

const config = RoleEnforcementConfiguration.parse({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<'data-structure' | 'union'>('/published-language', ['data-structure', 'union']),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [dataStructureRole, unionRole],
})

function runWith(source: string) {
  return withWorkspaceFixture(
    {
      prefix: 'role-enforcement-published-language-',
      roles: [dataStructureRole, unionRole],
      files: {
        'packages/pkg-a/src/published-language/types.ts': source,
      },
    },
    (workspaceDir) => runTestRoleEnforcement(config, workspaceDir),
  )
}

it('allows a data structure containing values', () => {
  const result = runWith(`/** @riviere-role data-structure */
export interface Link {
  source: string
  target: string
}
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a method in a data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export interface Link {
  resolve(): string
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' does not allow methods")
})

it('rejects a function-valued field in a data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export interface Link {
  resolve: () => string
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' does not allow methods")
})

it('allows a type alias containing data', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = {
  source: string
  target: string
}
`)

  expect(result.exitCode).toBe(0)
})

it('allows a Readonly type alias containing data', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = Readonly<{
  source: string
  target: string
}>
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a method in a type-alias data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = {
  resolve(): string
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' does not allow methods")
})

it('rejects a function-valued field in a type-alias data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = {
  resolve: () => string
}
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' does not allow methods")
})

it('rejects a function-valued field inside a Readonly data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = Readonly<{
  resolve: () => string
}>
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' does not allow methods")
})

it('rejects a callable type alias as a data structure', () => {
  const result = runWith(`/** @riviere-role data-structure */
export type Link = () => string
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'data-structure' must be a data structure")
})

it('allows a published union', () => {
  const result = runWith(`/** @riviere-role union */
export type LinkType = 'sync' | 'async'
`)

  expect(result.exitCode).toBe(0)
})

it('rejects a type alias that is not a union', () => {
  const result = runWith(`/** @riviere-role union */
export type LinkType = string
`)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain("Role 'union' requires a union type")
})
