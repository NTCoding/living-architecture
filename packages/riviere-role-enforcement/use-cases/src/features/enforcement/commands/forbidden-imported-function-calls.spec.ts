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
  role('command-input-factory', {
    targets: ['function'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('entrypoint-cli-input-parser', {
    targets: ['function'],
    forbiddenImportedFunctionCalls: true,
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

const testConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location<TestRoleName>('/entrypoint', [
          'command-input-factory',
          'entrypoint-cli-input-parser',
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
      files: {},
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
    expect(result.stdout).toContain('Classify the responsibility first')
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
