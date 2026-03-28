import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'
import { vi } from 'vitest'
import { RoleEnforcementConfigError } from '../config/role-enforcement-config-error'
import {
  formatRoleEnforcementFailure,
  RoleEnforcementExecutionError,
  runRoleEnforcement,
} from './run-role-enforcement'

function createFixtureWorkspace(): string {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'role-enforcement-error-'))
  fs.mkdirSync(path.join(workspaceDir, 'src', 'entrypoint'), { recursive: true })
  fs.writeFileSync(
    path.join(workspaceDir, 'src', 'entrypoint', 'cli.ts'),
    '/** @riviere-role cli-entrypoint */\nexport function createCli(): void {}\n',
  )
  fs.writeFileSync(
    path.join(workspaceDir, 'role-enforcement.config.json'),
    JSON.stringify(
      {
        ignorePatterns: [],
        include: ['src/**/*.ts'],
        layers: {
          entrypoint: {
            allowedRoles: ['cli-entrypoint'],
            paths: ['src/entrypoint'],
          },
        },
        roles: [
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

describe('runRoleEnforcement error handling', () => {
  it('throws execution errors when oxlint cannot be started', () => {
    const workspaceDir = createFixtureWorkspace()

    expect(() =>
      runRoleEnforcement(path.join(workspaceDir, 'role-enforcement.config.json'), {
        now: () => 100,
        readdirSync: vi.fn(() => []),
        realpathSync: (value) => String(value),
        rmSync: vi.fn(),
        spawnSync: vi.fn(() => ({
          error: new TypeError('spawn failed'),
          status: null,
          stderr: '',
          stdout: '',
        })),
        writeFileSync: vi.fn(),
      }),
    ).toThrowError(new RoleEnforcementExecutionError('spawn failed'))

    fs.rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  })

  it('formats known and unknown failures clearly', () => {
    expect(formatRoleEnforcementFailure(new RoleEnforcementConfigError('bad config'))).toBe(
      'bad config',
    )
    expect(formatRoleEnforcementFailure(new RoleEnforcementExecutionError('bad process'))).toBe(
      'bad process',
    )
    expect(formatRoleEnforcementFailure(new TypeError('boom'))).toBe('boom')
    expect(formatRoleEnforcementFailure('wat')).toBe('Unknown role enforcement failure.')
  })

  it('removes the temporary oxlint config after execution', () => {
    const workspaceDir = createFixtureWorkspace()
    const rmSyncMock = vi.fn()
    const nowMock = vi.fn().mockReturnValueOnce(100).mockReturnValue(125)

    runRoleEnforcement(path.join(workspaceDir, 'role-enforcement.config.json'), {
      now: nowMock,
      readdirSync: vi.fn(() => []),
      realpathSync: (value) => String(value),
      rmSync: rmSyncMock,
      spawnSync: vi.fn(() => ({
        status: 0,
        stderr: '',
        stdout: '',
      })),
      writeFileSync: vi.fn(),
    })

    expect(
      rmSyncMock.mock.calls.some(
        ([filePath]) =>
          typeof filePath === 'string' && filePath.includes('.oxlintrc.role-enforcement.'),
      ),
    ).toBe(true)

    fs.rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  })

  it('defaults the exit code to 1 when oxlint returns no status', () => {
    const workspaceDir = createFixtureWorkspace()

    const result = runRoleEnforcement(path.join(workspaceDir, 'role-enforcement.config.json'), {
      now: vi.fn().mockReturnValueOnce(100).mockReturnValue(125),
      readdirSync: vi.fn(() => []),
      realpathSync: (value) => String(value),
      rmSync: vi.fn(),
      spawnSync: vi.fn(() => ({
        status: null,
        stderr: '',
        stdout: '',
      })),
      writeFileSync: vi.fn(),
    })

    expect(result.exitCode).toBe(1)

    fs.rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  })
})
