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
} from '../config/role-enforcement-builder'
import { runRoleEnforcement } from './run-role-enforcement'

const testRoles = [
  role('command-use-case', {
    targets: ['function'],
    allowedInputs: ['command-use-case-input'],
    allowedNames: ['runThing'],
    allowedOutputs: ['command-use-case-result'],
  }),
  role('command-use-case-input', {
    targets: ['interface'],
    allowedNames: ['RunThingInput'],
  }),
  role('command-use-case-result', {
    targets: ['interface'],
    allowedNames: ['RunThingResult'],
  }),
  role('cli-entrypoint', {
    targets: ['function'],
    allowedNames: ['createCli'],
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

function createFixtureWorkspace(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-workspace-'))
  const pkgDir = path.join(workspaceDir, 'packages', 'my-app')
  mkdirSync(path.join(pkgDir, 'src', 'commands'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'entrypoint'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThingInput.ts'),
    `/** @riviere-role command-use-case-input */
export interface RunThingInput {
  configPath: string
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThingResult.ts'),
    `/** @riviere-role command-use-case-result */
export interface RunThingResult {
  status: 'ok'
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: RunThingInput): RunThingResult {
  return {
    status: 'ok',
  }
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'entrypoint', 'cli.ts'),
    `/** @riviere-role cli-entrypoint */
export function createCli(): void {}
`,
  )

  const roleDefsDir = path.join(workspaceDir, '.riviere', 'role-definitions')
  writeFileSync(path.join(roleDefsDir, 'index.md'), '# Role Definitions')
  for (const r of testRoles) {
    writeFileSync(path.join(roleDefsDir, `${r.name}.md`), `# ${r.name}`)
  }

  return workspaceDir
}

const testConfig = roleEnforcement({
  packages: ['packages/my-app'],
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
  locations: [
    location<TestRoleName>('src')
      .subLocation('/commands', [
        'command-use-case',
        'command-use-case-input',
        'command-use-case-result',
      ])
      .subLocation('/entrypoint', ['cli-entrypoint']),
  ],
})

it('runs oxlint successfully for a valid fixture workspace', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('reports invalid command input role usage', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: string): RunThingResult {
  return {
    status: 'ok',
  }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'command-use-case' only allows inputs [command-use-case-input]",
  )

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})
