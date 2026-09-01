import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { enforce, enforceWithoutPluginRule } from './__fixtures__/role-enforcement-plugin-fixture'

it('returns no diagnostics when the plugin rule is unavailable', () => {
  expect(enforceWithoutPluginRule()).toStrictEqual([])
})

it('rejects direct invocation of an imported function', () => {
  const messages = enforce(`import { execute } from 'external-client'

/** @riviere-role command-input-factory */
export function createInput() {
  return execute()
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("forbids direct invocation of imported function 'execute'")
  expect(messages[0]?.message).toContain(
    'STOP. Before changing any code read: .riviere/role-definitions/command-input-factory.md.',
  )
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

it('allows a CLI input parser to accept an unclassified raw input', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser */
export function parseInput(value: string): string {
  return value
}
`)

  expect(messages).toHaveLength(0)
})

it('rejects a CLI input parser whose name does not begin with parse', () => {
  const messages = enforce(`/** @riviere-role entrypoint-cli-input-parser */
export function loadInput(value: string): string {
  return value
}
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain(
    "Role 'entrypoint-cli-input-parser' does not allow name 'loadInput'",
  )
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

it('rejects local and unclassified callable collaborators in CLI entrypoint dependencies', () => {
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
      `import { readFileSync } from 'node:fs'
import { createCommand } from './command'

/** @riviere-role command-input-factory */
function resolveProjectPath(filePath: string): string {
  return filePath
}

createCommand({
  resolveProjectPath,
  readFile: readFileSync,
})
`,
      { configDir: workspaceDir, filename: compositionRootPath },
    )

    expect(messages).toHaveLength(2)
    expect(
      messages.every((message) => message.message.includes('requires each collaborator')),
    ).toBe(true)
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})

it('rejects aliased entrypoints, scoped collaborators, expressions, and spreads', () => {
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
      `import * as command from './command'
const createCommand = command.createCommand
function compose() {
  const localCollaborator = () => 'value'
  createCommand({
    localCollaborator,
    expression: localCollaborator ? localCollaborator : localCollaborator,
    ...{ spreadCollaborator: localCollaborator },
  })
}
compose()
`,
      { configDir: workspaceDir, filename: compositionRootPath },
    )

    expect(messages).toHaveLength(3)
    expect(
      messages.every((message) => message.message.includes('requires each collaborator')),
    ).toBe(true)
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})

it('allows scalar entrypoint options but rejects function scoped collaborators', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const commandPath = join(entrypointDir, 'command.ts')
  const compositionRootPath = join(entrypointDir, 'composition-root.ts')

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(
      commandPath,
      `/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {
  readonly packageFilter?: string
  readonly collaborator: unknown
}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies) {}
`,
      { encoding: 'utf8', flag: 'w' },
    )

    const messages = enforce(
      `import { createCommand } from './command'
function compose(packageFilter: string | undefined, collaborator: () => string) {
  createCommand({ packageFilter, collaborator })
}
compose(undefined, () => 'value')
`,
      { configDir: workspaceDir, filename: compositionRootPath },
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain('requires each collaborator')
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
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
      'STOP. Before changing any code read: .riviere/role-definitions/cli-entrypoint.md.',
    )
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})
