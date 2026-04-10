import type { RoleEnforcementRunResult } from '../domain/role-enforcement-run-result'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-run-result'
import {
  readConfig as defaultReadConfig,
  readConfigForPackage as defaultReadConfigForPackage,
} from '../infra/external-clients/oxlint/config-reader'
import { runRoleEnforcement as defaultRunRoleEnforcement } from './run-role-enforcement'

interface RunRoleEnforcementFromModuleDeps {
  readConfig: typeof defaultReadConfig
  readConfigForPackage: typeof defaultReadConfigForPackage
  runRoleEnforcement: typeof defaultRunRoleEnforcement
}

const defaultDeps: RunRoleEnforcementFromModuleDeps = {
  readConfig: defaultReadConfig,
  readConfigForPackage: defaultReadConfigForPackage,
  runRoleEnforcement: defaultRunRoleEnforcement,
}

/** @riviere-role command-orchestrator */
export function runRoleEnforcementFromModule(
  configModule: unknown,
  configDir: string,
  packageFilter?: string,
  deps: RunRoleEnforcementFromModuleDeps = defaultDeps,
): RoleEnforcementRunResult {
  try {
    const config =
      packageFilter === undefined
        ? deps.readConfig(configModule)
        : deps.readConfigForPackage(configModule, packageFilter)
    return deps.runRoleEnforcement(config, configDir)
  } catch (error) {
    if (error instanceof RoleEnforcementExecutionError) {
      return {
        durationMs: 0,
        exitCode: 1,
        stderr: `${error.message}\n`,
        stdout: '',
      }
    }
    throw error
  }
}
