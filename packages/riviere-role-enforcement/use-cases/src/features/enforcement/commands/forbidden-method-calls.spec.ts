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
  writeFixtureFile,
} from './test-fixture-workspace'

const testRoles = [
  role('role-a', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('role-main', {
    targets: ['function'],
    forbiddenMethodCalls: ['role-a'],
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

const testLocations = locationConfiguration(
  location<TestRoleName>('/commands', ['role-a']),
  location<TestRoleName>('/shell', ['role-main']),
)

const testConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: testLocations,
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
})

const fixtureBootstrap = {
  prefix: 'forbidden-method-calls-',
  roles: testRoles,
  files: {
    'packages/pkg-a/src/commands/alpha.ts': `/** @riviere-role role-a */
export class Alpha {
  execute(): void {}
}
`,
  },
}

function withFixtureWorkspace(fn: (workspaceDir: string) => void) {
  withWorkspaceFixture(fixtureBootstrap, fn)
}

function writeShellFile(workspaceDir: string, content: string) {
  writeFixtureFile(workspaceDir, 'packages/pkg-a/src/shell/main.ts', content)
}

it('rejects non-construction usage of imports with forbidden method call roles', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeShellFile(
      workspaceDir,
      `import { Alpha } from '../commands/alpha'

/** @riviere-role role-main */
export function runRoleMain(): void {
  Alpha.staticMethod()
}
`,
    )
    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: testConfig },
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('forbids non-construction usage')
    expect(result.stdout).toContain('role-a')
  })
})

it('rejects passing forbidden role import as function argument', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeShellFile(
      workspaceDir,
      `import { Alpha } from '../commands/alpha'

/** @riviere-role role-main */
export function runRoleMain(): void {
  console.log(Alpha)
}
`,
    )
    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: testConfig },
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('forbids non-construction usage')
  })
})

it('accepts construction of imports with forbidden method call roles', () => {
  withFixtureWorkspace((workspaceDir) => {
    writeShellFile(
      workspaceDir,
      `import { Alpha } from '../commands/alpha'

/** @riviere-role role-main */
export function runRoleMain(): void {
  const instance = new Alpha()
}
`,
    )
    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: testConfig },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})
