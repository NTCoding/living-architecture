import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Linter } from 'eslint'
import { parser } from 'typescript-eslint'
import { expect, it } from 'vitest'
import plugin from '@living-architecture/riviere-role-enforcement-domain-model/plugin'
import { location, locationConfiguration, role, roleEnforcementConfiguration } from '../index'

const commandInputFactory = role('command-input-factory', {
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliInputParser = role('entrypoint-cli-input-parser', {
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliInputParserDependencies = role('entrypoint-cli-input-parser-dependencies', {
  forbiddenInlineCallableMembers: true,
  nameMatches: '.*CliInputParserDependencies$',
  targets: ['interface'],
})

const cliEntrypoint = role('cli-entrypoint', {
  allowedInputs: ['cli-entrypoint-dependencies'],
  forbiddenDependencies: ['cli-entrypoint'],
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliEntrypointDependencies = role('cli-entrypoint-dependencies', {
  forbiddenInlineFunctionImplementations: true,
  nameMatches: '.*EntrypointDependencies$',
  targets: ['interface'],
})

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/example': {
      locations: locationConfiguration(
        location('/entrypoint', [
          'command-input-factory',
          'entrypoint-cli-input-parser',
          'entrypoint-cli-input-parser-dependencies',
          'cli-entrypoint',
          'cli-entrypoint-dependencies',
        ]),
      ),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [
    commandInputFactory,
    cliInputParser,
    cliInputParserDependencies,
    cliEntrypoint,
    cliEntrypointDependencies,
  ],
})

function enforce(source: string, options: { configDir?: string; filename?: string } = {}) {
  const configDir = options.configDir ?? '/workspace'
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
  expect(messages[0]?.message).toContain('Classify the responsibility first')
})

it('rejects direct invocation of an imported function from a CLI input parser', () => {
  const messages = enforce(`import { execute } from 'external-client'

/** @riviere-role entrypoint-cli-input-parser */
export function parseInput() {
  return execute()
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids direct invocation of imported function 'execute'")
})

it('rejects an inline callable property in CLI input parser dependencies', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readonly readFile: (filePath: string) => string
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain(
    "forbids inline callable members on 'ExampleCliInputParserDependencies'",
  )
})

it('rejects an inline callable method in CLI input parser dependencies', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readFile(filePath: string): string
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain(
    "forbids inline callable members on 'ExampleCliInputParserDependencies'",
  )
})

it('rejects an inline callable signature in CLI input parser dependencies', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  (filePath: string): string
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain(
    "forbids inline callable members on 'ExampleCliInputParserDependencies'",
  )
})

it('rejects an inline construct signature in CLI input parser dependencies', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  new (filePath: string): object
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain(
    "forbids inline callable members on 'ExampleCliInputParserDependencies'",
  )
})

it('allows CLI input parser dependencies to reference a named collaborator', () => {
  const messages = enforce(`import { readFile } from 'external-client'

/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readonly readFile: typeof readFile
}
`)

  expect(messages).toStrictEqual([])
})

it('rejects direct invocation of an imported function from a CLI entrypoint', () => {
  const messages = enforce(`import { execute } from 'external-client'

/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies) {
  return execute(dependencies)
}
`)

  expect(messages.map((message) => message.message).join('\n')).toContain(
    "forbids direct invocation of imported function 'execute'",
  )
})

it('rejects inline function implementations in CLI entrypoint dependencies', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const commandPath = join(entrypointDir, 'command.ts')
  const compositionRootPath = join(entrypointDir, 'composition-root.ts')

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(
      commandPath,
      `/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies) {}
`,
      { encoding: 'utf8', flag: 'w' },
    )

    const messages = enforce(
      `import { createCommand } from './command'

createCommand({
  sourceFileSelection: {
    runGit: (args: string[]) => args.join(' '),
  },
})
`,
      { configDir: workspaceDir, filename: compositionRootPath },
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain(
      "Role 'cli-entrypoint-dependencies' forbids inline function implementations",
    )
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
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

/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies) {
  return createHelper()
}
`,
      { configDir: workspaceDir, filename: entrypointPath },
    )

    expect(messages.map((message) => message.message).join('\n')).toContain(
      "cannot import from a file exporting 'cli-entrypoint'",
    )
    expect(messages.map((message) => message.message).join('\n')).toContain(
      'Classify the responsibility first',
    )
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})
