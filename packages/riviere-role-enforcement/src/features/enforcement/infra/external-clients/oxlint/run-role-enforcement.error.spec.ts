import { vi } from 'vitest'
import {
  location, role, roleEnforcement 
} from '../../../domain/role-enforcement-builder'
import {
  formatRoleEnforcementFailure,
  RoleEnforcementExecutionError,
  runRoleEnforcement,
} from './run-role-enforcement'

const minimalConfig = roleEnforcement({
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  packages: ['packages/my-app'],
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [role('cli-entrypoint', { targets: ['function'] })] as const,
  locations: [location<'cli-entrypoint'>('src').subLocation('/entrypoint', ['cli-entrypoint'])],
})

describe('runRoleEnforcement error handling', () => {
  it('throws execution errors when oxlint cannot be started', () => {
    expect(() =>
      runRoleEnforcement(minimalConfig, '/var/folders/fake-dir', {
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
  })

  it('formats known and unknown failures clearly', () => {
    expect(formatRoleEnforcementFailure(new RoleEnforcementExecutionError('bad process'))).toBe(
      'bad process',
    )
    expect(formatRoleEnforcementFailure(new TypeError('boom'))).toBe('boom')
    expect(formatRoleEnforcementFailure('wat')).toBe('Unknown role enforcement failure.')
  })

  it('removes the temporary oxlint config after execution', () => {
    const rmSyncMock = vi.fn()

    runRoleEnforcement(minimalConfig, '/var/folders/fake-dir', {
      now: vi.fn().mockReturnValueOnce(100).mockReturnValue(125),
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
  })

  it('defaults the exit code to 1 when oxlint returns no status', () => {
    const result = runRoleEnforcement(minimalConfig, '/var/folders/fake-dir', {
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
  })
})
