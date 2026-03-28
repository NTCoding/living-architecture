import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import { runRoleEnforcement } from './run-role-enforcement'

function createFixtureWorkspace(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-workspace-'))
  mkdirSync(path.join(workspaceDir, 'src', 'commands'), { recursive: true })
  mkdirSync(path.join(workspaceDir, 'src', 'entrypoint'), { recursive: true })

  writeFileSync(
    path.join(workspaceDir, 'src', 'commands', 'runThingInput.ts'),
    `/** @riviere-role command-use-case-input */
export interface RunThingInput {
  configPath: string
}
`,
  )
  writeFileSync(
    path.join(workspaceDir, 'src', 'commands', 'runThingResult.ts'),
    `/** @riviere-role command-use-case-result */
export interface RunThingResult {
  status: 'ok'
}
`,
  )
  writeFileSync(
    path.join(workspaceDir, 'src', 'commands', 'runThing.ts'),
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
    path.join(workspaceDir, 'src', 'entrypoint', 'cli.ts'),
    `/** @riviere-role cli-entrypoint */
export function createCli(): void {}
`,
  )

  writeFileSync(
    path.join(workspaceDir, 'role-enforcement.config.json'),
    JSON.stringify(
      {
        ignorePatterns: ['**/*.spec.ts'],
        include: ['src/**/*.ts'],
        layers: {
          commands: {
            allowedRoles: ['command-use-case', 'command-use-case-input', 'command-use-case-result'],
            paths: ['src/commands'],
          },
          entrypoint: {
            allowedRoles: ['cli-entrypoint'],
            paths: ['src/entrypoint'],
          },
        },
        roles: [
          {
            allowedInputs: ['command-use-case-input'],
            allowedNames: ['runThing'],
            allowedOutputs: ['command-use-case-result'],
            name: 'command-use-case',
            targets: ['function'],
          },
          {
            allowedNames: ['RunThingInput'],
            name: 'command-use-case-input',
            targets: ['interface'],
          },
          {
            allowedNames: ['RunThingResult'],
            name: 'command-use-case-result',
            targets: ['interface'],
          },
          {
            allowedNames: ['createCli'],
            name: 'cli-entrypoint',
            targets: ['function'],
          },
        ],
      },
      null,
      2,
    ),
  )

  return workspaceDir
}

it('runs oxlint successfully for a valid fixture workspace', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(path.join(workspaceDir, 'role-enforcement.config.json'))

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
    path.join(workspaceDir, 'src', 'commands', 'runThing.ts'),
    `import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: string): RunThingResult {
  return {
    status: 'ok',
  }
}
`,
  )

  const result = runRoleEnforcement(path.join(workspaceDir, 'role-enforcement.config.json'))

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'command-use-case' only allows inputs [command-use-case-input]",
  )

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})
