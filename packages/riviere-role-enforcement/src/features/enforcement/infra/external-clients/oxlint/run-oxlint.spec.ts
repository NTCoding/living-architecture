import { existsSync } from 'node:fs'
import {
  describe, expect, it, vi 
} from 'vitest'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'
import type { OxlintConfig } from './create-oxlint-config'
import { runOxlint } from './run-oxlint'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  }
})

const minimalOxlintConfig: OxlintConfig = {
  ignorePatterns: [],
  jsPlugins: [],
  rules: {
    'riviere-role-enforcement/enforce-roles': [
      'error',
      {
        configDir: '/var/folders/fake-dir',
        configDisplayPath: 'role-enforcement.config.ts',
        layers: {},
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [],
      },
    ],
  },
}

describe('runOxlint', () => {
  it('throws RoleEnforcementExecutionError when spawnSync reports an error', () => {
    expect(() =>
      runOxlint({
        oxlintConfig: minimalOxlintConfig,
        configDir: '/var/folders/fake-dir',
        lintTargets: [],
        deps: {
          rmSync: vi.fn(),
          spawnSync: vi.fn(() => ({
            error: new TypeError('spawn failed'),
            status: null,
            stderr: '',
            stdout: '',
          })),
          writeFileSync: vi.fn(),
        },
      }),
    ).toThrowError(new RoleEnforcementExecutionError('spawn failed'))
  })

  it('removes the temporary oxlint config after execution', () => {
    const rmSyncMock = vi.fn()

    runOxlint({
      oxlintConfig: minimalOxlintConfig,
      configDir: '/var/folders/fake-dir',
      lintTargets: [],
      deps: {
        rmSync: rmSyncMock,
        spawnSync: vi.fn(() => ({
          status: 0,
          stderr: '',
          stdout: '',
        })),
        writeFileSync: vi.fn(),
      },
    })

    expect(
      rmSyncMock.mock.calls.some(
        ([filePath]) =>
          typeof filePath === 'string' && filePath.includes('.oxlintrc.role-enforcement.'),
      ),
    ).toBe(true)
  })

  it('throws RoleEnforcementExecutionError when oxlint binary cannot be found', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    try {
      expect(() =>
        runOxlint({
          oxlintConfig: minimalOxlintConfig,
          configDir: '/var/folders/fake-dir',
          lintTargets: [],
          deps: {
            rmSync: vi.fn(),
            spawnSync: vi.fn(() => ({
              status: 0,
              stderr: '',
              stdout: '',
            })),
            writeFileSync: vi.fn(),
          },
        }),
      ).toThrowError(new RoleEnforcementExecutionError('Cannot find oxlint binary in node_modules'))
    } finally {
      vi.mocked(existsSync).mockRestore()
    }
  })

  it('defaults the exit code to 1 when spawnSync returns no status', () => {
    const result = runOxlint({
      oxlintConfig: minimalOxlintConfig,
      configDir: '/var/folders/fake-dir',
      lintTargets: [],
      deps: {
        rmSync: vi.fn(),
        spawnSync: vi.fn(() => ({
          status: null,
          stderr: '',
          stdout: '',
        })),
        writeFileSync: vi.fn(),
      },
    })

    expect(result.exitCode).toBe(1)
  })
})
