import { expect, it } from 'vitest'
import { Linter } from 'eslint'
import { parser } from 'typescript-eslint'
import plugin from '@living-architecture/riviere-role-enforcement-domain-model/plugin'
import { location, locationConfiguration, role, roleEnforcementConfiguration } from '../index'

const dataRole = role('data-role', {
  targets: ['class', 'interface', 'type-alias'],
  forbiddenSupertypes: true,
})

const dataRoleConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/example': {
      locations: locationConfiguration(location('/data', ['data-role'])),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [dataRole],
})

function enforceWithData(source: string) {
  const linter = new Linter({ configType: 'eslintrc' })
  const enforceRolesRule = plugin.rules['enforce-roles']
  if (enforceRolesRule === undefined) {
    return []
  }
  linter.defineRule('enforce-roles', enforceRolesRule)
  linter.defineParser('typescript', parser)

  return linter.verify(
    source,
    {
      parser: 'typescript',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      rules: {
        'enforce-roles': [
          'error',
          {
            configDir: '/workspace',
            configDisplayPath: '.riviere/roles.ts',
            locationHierarchy: dataRoleConfig.locationHierarchy,
            roleDefinitionsDir: dataRoleConfig.roleDefinitionsDir,
            roles: dataRoleConfig.roles,
          },
        ],
      },
    },
    { filename: '/workspace/packages/example/src/data/types.ts' },
  )
}

it('rejects a type alias with an intersection supertype', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export type MyType = SomeBase & { extra: string }
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids supertypes on 'MyType'")
})

it('rejects a type alias with an intersection inside a union', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export type MyType = ({ ok: true } & BaseFields) | { ok: false; error: string }
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids supertypes on 'MyType'")
})

it('rejects a class extending a type', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export class MyType extends BaseClass {}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids supertypes on 'MyType'")
})

it('rejects an interface extending a type', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export interface MyType extends BaseInterface {}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids supertypes on 'MyType'")
})

it('allows a plain type alias without supertypes', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export type MyType = { foo: string; bar: number }
`)

  expect(messages).toStrictEqual([])
})

it('allows a type alias with a generic type reference but no intersection', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export type MyType = Readonly<Record<string, never>>
`)

  expect(messages).toStrictEqual([])
})

it('allows a type alias that is a plain union without intersections', () => {
  const messages = enforceWithData(`/** @riviere-role data-role */
export type MyType = { a: string } | { b: number }
`)

  expect(messages).toStrictEqual([])
})
