import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import {
  location, role, roleEnforcement 
} from '../domain/role-enforcement-builder'
import { runRoleEnforcement } from './run-role-enforcement'

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

const testLocations = [
  location<TestRoleName>('src')
    .subLocation('/commands', ['role-a'])
    .subLocation('/shell', ['role-main']),
]

const testConfig = roleEnforcement({
  packages: ['packages/pkg-a'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
  locations: testLocations,
})

function createFixtureWorkspace(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'forbidden-method-calls-'))
  const pkgDir = path.join(workspaceDir, 'packages', 'pkg-a')
  mkdirSync(path.join(pkgDir, 'src', 'commands'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'shell'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  writeFileSync(
    path.join(workspaceDir, '.riviere', 'canonical-role-configurations.md'),
    '# Canonical Role Configurations',
  )
  const roleDefsDir = path.join(workspaceDir, '.riviere', 'role-definitions')
  for (const r of testRoles) {
    writeFileSync(path.join(roleDefsDir, `${r.name}.md`), `# ${r.name}`)
  }

  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'alpha.ts'),
    `/** @riviere-role role-a */
export class Alpha {
  execute(): void {}
}
`,
  )

  return workspaceDir
}

function withFixtureWorkspace(fn: (workspaceDir: string) => void) {
  const workspaceDir = createFixtureWorkspace()
  try {
    fn(workspaceDir)
  } finally {
    rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  }
}

function writeShellFile(workspaceDir: string, content: string) {
  writeFileSync(path.join(workspaceDir, 'packages', 'pkg-a', 'src', 'shell', 'main.ts'), content)
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
    const result = runRoleEnforcement(testConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
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
    const result = runRoleEnforcement(testConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
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
    const result = runRoleEnforcement(testConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})
