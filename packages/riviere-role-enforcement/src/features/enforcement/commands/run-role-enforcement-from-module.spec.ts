import {
  describe, expect, it, vi 
} from 'vitest'
import type { RoleEnforcementResult } from '../domain/role-enforcement-builder'
import {
  RoleEnforcementExecutionError,
  type RoleEnforcementRunResult,
} from '../domain/role-enforcement-run-result'
import { runRoleEnforcementFromModule } from './run-role-enforcement-from-module'

const fakeConfig: RoleEnforcementResult = {
  ignorePatterns: [],
  include: [],
  layers: {},
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [],
}

const successResult: RoleEnforcementRunResult = {
  durationMs: 42,
  exitCode: 0,
  stderr: '',
  stdout: 'ok',
}

describe('runRoleEnforcementFromModule', () => {
  it('delegates to runRoleEnforcement with the loaded config when no package filter is provided', () => {
    const readConfig = vi.fn().mockReturnValue(fakeConfig)
    const readConfigForPackage = vi.fn()
    const runRoleEnforcement = vi.fn().mockReturnValue(successResult)

    const result = runRoleEnforcementFromModule({ config: fakeConfig }, '/config-dir', undefined, {
      readConfig,
      readConfigForPackage,
      runRoleEnforcement,
    })

    expect(readConfig).toHaveBeenCalledWith({ config: fakeConfig })
    expect(readConfigForPackage).not.toHaveBeenCalled()
    expect(runRoleEnforcement).toHaveBeenCalledWith(fakeConfig, '/config-dir')
    expect(result).toStrictEqual(successResult)
  })

  it('delegates to readConfigForPackage when a package filter is provided', () => {
    const readConfig = vi.fn()
    const readConfigForPackage = vi.fn().mockReturnValue(fakeConfig)
    const runRoleEnforcement = vi.fn().mockReturnValue(successResult)

    const result = runRoleEnforcementFromModule({ config: fakeConfig }, '/config-dir', 'pkg-a', {
      readConfig,
      readConfigForPackage,
      runRoleEnforcement,
    })

    expect(readConfigForPackage).toHaveBeenCalledWith({ config: fakeConfig }, 'pkg-a')
    expect(readConfig).not.toHaveBeenCalled()
    expect(runRoleEnforcement).toHaveBeenCalledWith(fakeConfig, '/config-dir')
    expect(result).toStrictEqual(successResult)
  })

  it('wraps RoleEnforcementExecutionError from readConfig into a failure result', () => {
    const readConfig = vi.fn().mockImplementation(() => {
      throw new RoleEnforcementExecutionError("Config module must export a 'config' property.")
    })
    const readConfigForPackage = vi.fn()
    const runRoleEnforcement = vi.fn()

    const result = runRoleEnforcementFromModule({}, '/config-dir', undefined, {
      readConfig,
      readConfigForPackage,
      runRoleEnforcement,
    })

    expect(runRoleEnforcement).not.toHaveBeenCalled()
    expect(result).toStrictEqual({
      durationMs: 0,
      exitCode: 1,
      stderr: "Config module must export a 'config' property.\n",
      stdout: '',
    })
  })

  it('wraps RoleEnforcementExecutionError from readConfigForPackage into a failure result', () => {
    const readConfig = vi.fn()
    const readConfigForPackage = vi.fn().mockImplementation(() => {
      throw new RoleEnforcementExecutionError("Package 'pkg-missing' not found in config.")
    })
    const runRoleEnforcement = vi.fn()

    const result = runRoleEnforcementFromModule({}, '/config-dir', 'pkg-missing', {
      readConfig,
      readConfigForPackage,
      runRoleEnforcement,
    })

    expect(runRoleEnforcement).not.toHaveBeenCalled()
    expect(result).toStrictEqual({
      durationMs: 0,
      exitCode: 1,
      stderr: "Package 'pkg-missing' not found in config.\n",
      stdout: '',
    })
  })

  it('wraps RoleEnforcementExecutionError from runRoleEnforcement into a failure result', () => {
    const readConfig = vi.fn().mockReturnValue(fakeConfig)
    const readConfigForPackage = vi.fn()
    const runRoleEnforcement = vi.fn().mockImplementation(() => {
      throw new RoleEnforcementExecutionError('oxlint spawn failed')
    })

    const result = runRoleEnforcementFromModule({ config: fakeConfig }, '/config-dir', undefined, {
      readConfig,
      readConfigForPackage,
      runRoleEnforcement,
    })

    expect(result).toStrictEqual({
      durationMs: 0,
      exitCode: 1,
      stderr: 'oxlint spawn failed\n',
      stdout: '',
    })
  })

  it('rethrows unknown errors from readConfig without wrapping them', () => {
    const unknownError = new TypeError('unexpected structural failure')
    const readConfig = vi.fn().mockImplementation(() => {
      throw unknownError
    })
    const readConfigForPackage = vi.fn()
    const runRoleEnforcement = vi.fn()

    expect(() =>
      runRoleEnforcementFromModule({}, '/config-dir', undefined, {
        readConfig,
        readConfigForPackage,
        runRoleEnforcement,
      }),
    ).toThrow(unknownError)
    expect(runRoleEnforcement).not.toHaveBeenCalled()
  })

  it('rethrows unknown errors from runRoleEnforcement without wrapping them', () => {
    const unknownError = new TypeError('spawn blew up')
    const readConfig = vi.fn().mockReturnValue(fakeConfig)
    const readConfigForPackage = vi.fn()
    const runRoleEnforcement = vi.fn().mockImplementation(() => {
      throw unknownError
    })

    expect(() =>
      runRoleEnforcementFromModule({ config: fakeConfig }, '/config-dir', undefined, {
        readConfig,
        readConfigForPackage,
        runRoleEnforcement,
      }),
    ).toThrow(unknownError)
  })
})
