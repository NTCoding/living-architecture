import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import {
  runTestRoleEnforcement,
  withWorkspaceFixture,
  writeFixtureFile,
} from './__fixtures__/test-fixture-workspace'

const testRoles = [
  role('command-input-factory', {
    targets: ['function'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('entrypoint-cli-input-parser', {
    targets: ['function'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('entrypoint-cli-input-parser-dependencies', {
    forbiddenInlineCallableMembers: true,
    nameMatches: '.*CliInputParserDependencies$',
    targets: ['interface'],
  }),
  role('cli-entrypoint', {
    targets: ['function'],
    allowedInputs: ['cli-entrypoint-dependencies'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('cli-entrypoint-dependencies', {
    forbiddenInlineFunctionImplementations: true,
    targets: ['interface'],
    nameMatches: '.*EntrypointDependencies$',
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

const testConfig = RoleEnforcementConfiguration.parse({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<TestRoleName>('/entrypoint', [
          'command-input-factory',
          'entrypoint-cli-input-parser',
          'entrypoint-cli-input-parser-dependencies',
          'cli-entrypoint',
          'cli-entrypoint-dependencies',
        ]),
      ),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
})

function withFixtureWorkspace(fn: (workspaceDir: string) => void) {
  withWorkspaceFixture(
    {
      prefix: 'forbidden-imported-function-calls-',
      roles: testRoles,
      files: {
        'node_modules/external-client/package.json': `{
  "name": "external-client",
  "exports": {
    ".": { "@living-architecture/source": "./src/index.ts" }
  }
}
`,
        'node_modules/external-client/src/index.ts': `export function readFile(filePath: string): string {
  return filePath
}
`,
      },
    },
    fn,
  )
}

function writeInputFactory(workspaceDir: string, content: string) {
  writeFixtureFile(workspaceDir, 'packages/pkg-a/src/entrypoint/input.ts', content)
}

it('rejects direct invocation of a statically imported function', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `import { execute } from 'external-client'

/** @riviere-role command-input-factory */
export function createInput(): string {
  return execute()
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('forbids direct invocation of imported function')
    expect(result.stdout).toContain('execute')
    expect(result.stdout).toContain('**IMPORTANT: Role check has failed.')
  })
})

it('rejects direct invocation of a statically imported function from a CLI input parser', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `import { execute } from 'external-client'

/** @riviere-role entrypoint-cli-input-parser */
export function parseInput(): string {
  return execute()
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('forbids direct invocation of imported function')
    expect(result.stdout).toContain('entrypoint-cli-input-parser')
  })
})

it('rejects inline callable members in CLI input parser dependencies', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readonly readFile: (filePath: string) => string
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(
      "forbids inline callable members on 'ExampleCliInputParserDependencies'",
    )
  })
})

it('rejects inline method members in CLI input parser dependencies', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readFile(filePath: string): string
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(
      "forbids inline callable members on 'ExampleCliInputParserDependencies'",
    )
  })
})

it('rejects inline call signatures in CLI input parser dependencies', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  (filePath: string): string
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(
      "forbids inline callable members on 'ExampleCliInputParserDependencies'",
    )
  })
})

it('rejects inline construct signatures in CLI input parser dependencies', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  new (filePath: string): object
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(
      "forbids inline callable members on 'ExampleCliInputParserDependencies'",
    )
  })
})

it('allows a CLI input parser dependency to reference a named collaborator', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `import { readFile } from 'external-client'

/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExampleCliInputParserDependencies {
  readonly readFile: typeof readFile
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects direct invocation of a statically imported function from a CLI entrypoint', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `import { execute } from 'external-client'

/** @riviere-role cli-entrypoint-dependencies */
interface ExampleEntrypointDependencies {}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies): string {
  return execute(dependencies)
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('forbids direct invocation of imported function')
    expect(result.stdout).toContain('cli-entrypoint')
  })
})

it('accepts invocation through a CLI entrypoint dependency object', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `import { execute } from 'external-client'

/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {
  readonly execute: typeof execute
}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies): string {
  return dependencies.execute()
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects inline function implementations in a CLI entrypoint dependency object', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role cli-entrypoint-dependencies */
export interface ExampleEntrypointDependencies {}

/** @riviere-role cli-entrypoint */
export function createCommand(dependencies: ExampleEntrypointDependencies): string {
  return 'command'
}

createCommand({
  sourceFileSelection: {
    runGit: (args: string[]) => args.join(' '),
  },
})
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(
      "Role 'cli-entrypoint-dependencies' forbids inline function implementations",
    )
  })
})

it('accepts an internal helper function', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `/** @riviere-role command-input-factory */
export function createInput(): string {
  return readDefaultValue()
}

function readDefaultValue(): string {
  return 'input'
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts a dependency passed as a parameter', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeInputFactory(
      workspaceDir,
      `type InputCreator = () => string

/** @riviere-role command-input-factory */
export function createInput(createValue: InputCreator): string {
  return createValue()
}
`,
    )

    const result = runTestRoleEnforcement(testConfig, workspaceDir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})
