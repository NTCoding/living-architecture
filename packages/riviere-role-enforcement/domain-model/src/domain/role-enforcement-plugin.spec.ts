import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import plugin from '@living-architecture/riviere-role-enforcement-domain-model/plugin'
import { location, locationConfiguration, role, roleEnforcementConfiguration } from '../index'

const commandInputFactory = role('command-input-factory', {
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/example': {
      locations: locationConfiguration(location('/entrypoint', ['command-input-factory'])),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [commandInputFactory],
})

function enforce(source: string) {
  const linter = new Linter({ configType: 'eslintrc' })
  const enforceRolesRule = plugin.rules['enforce-roles']
  if (enforceRolesRule === undefined) {
    return []
  }
  linter.defineRule('enforce-roles', enforceRolesRule)

  return linter.verify(
    source,
    {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'enforce-roles': [
          'error',
          {
            configDir: '/workspace',
            configDisplayPath: '.riviere/roles.ts',
            locationHierarchy: config.locationHierarchy,
            roleDefinitionsDir: config.roleDefinitionsDir,
            roles: config.roles,
          },
        ],
      },
    },
    { filename: '/workspace/packages/example/src/entrypoint/input.ts' },
  )
}

it('rejects direct invocation of an imported function', () => {
  const messages = enforce(`import { execute } from 'external-client'

/** @riviere-role command-input-factory */
export function createInput() {
  return execute()
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids direct invocation of imported function 'execute'")
})

it('allows internal helper functions and dependencies passed as parameters', () => {
  const messages = enforce(`/** @riviere-role command-input-factory */
export function createInput(createValue) {
  return createValue(readDefaultValue())
}

function readDefaultValue() {
  return 'input'
}
`)

  expect(messages).toStrictEqual([])
})
