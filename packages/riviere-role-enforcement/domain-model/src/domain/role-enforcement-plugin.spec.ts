import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import plugin from '@living-architecture/riviere-role-enforcement-domain-model/plugin'
import { location, locationConfiguration, role, roleEnforcementConfiguration } from '../index'

const commandInputFactory = role('command-input-factory', {
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliEntrypoint = role('cli-entrypoint', {
  forbiddenDependencies: ['cli-entrypoint'],
  targets: ['function'],
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/example': {
      locations: locationConfiguration(
        location('/entrypoint', ['command-input-factory', 'cli-entrypoint']),
      ),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [commandInputFactory, cliEntrypoint],
})

function enforce(source: string, options: { configDir?: string; filename?: string } = {}) {
  const configDir = options.configDir ?? '/workspace'
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
            configDir,
            configDisplayPath: '.riviere/roles.ts',
            locationHierarchy: config.locationHierarchy,
            roleDefinitionsDir: config.roleDefinitionsDir,
            roles: config.roles,
          },
        ],
      },
    },
    { filename: options.filename ?? '/workspace/packages/example/src/entrypoint/input.ts' },
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

it('explains how to correct a forbidden entrypoint dependency', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const helperPath = join(entrypointDir, 'helper.ts')
  const entrypointPath = join(entrypointDir, 'entrypoint.ts')

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(
      helperPath,
      `/** @riviere-role cli-entrypoint */
export function createHelper(): string {
  return 'helper'
}
`,
      { encoding: 'utf8', flag: 'w' },
    )

    const messages = enforce(
      `import { createHelper } from './helper'

/** @riviere-role cli-entrypoint */
export function createCommand() {
  return createHelper()
}
`,
      { configDir: workspaceDir, filename: entrypointPath },
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain("cannot import from a file exporting 'cli-entrypoint'")
    expect(messages[0]?.message).toContain('Classify the responsibility first')
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})
