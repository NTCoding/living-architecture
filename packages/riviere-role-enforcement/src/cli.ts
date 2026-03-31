import type { RoleEnforcementResult } from './config/role-enforcement-builder'
import {
  formatRoleEnforcementFailure,
  RoleEnforcementExecutionError,
  runRoleEnforcement,
} from './cli/run-role-enforcement'

export function main(configModule: unknown, configDir: string): number {
  try {
    const config = readConfig(configModule)
    const result = runRoleEnforcement(config, configDir)
    if (result.stdout !== '') {
      process.stdout.write(result.stdout)
    }
    if (result.stderr !== '') {
      process.stderr.write(result.stderr)
    }
    process.stderr.write(`Role enforcement completed in ${Math.round(result.durationMs)}ms\n`)
    return result.exitCode
  } catch (error) {
    process.stderr.write(`${formatRoleEnforcementFailure(error)}\n`)
    return 1
  }
}

function readConfig(configModule: unknown): RoleEnforcementResult {
  const resolved = resolveModuleExports(configModule)
  if (typeof resolved !== 'object' || resolved === null || !('config' in resolved)) {
    throw new RoleEnforcementExecutionError("Config module must export a 'config' property.")
  }

  const { config } = resolved
  assertRoleEnforcementResult(config)
  return config
}

function resolveModuleExports(loaded: unknown): unknown {
  if (typeof loaded !== 'object' || loaded === null) {
    return loaded
  }

  if ('config' in loaded) {
    return loaded
  }

  if ('default' in loaded) {
    return loaded.default
  }

  return loaded
}

function assertRoleEnforcementResult(value: unknown): asserts value is RoleEnforcementResult {
  if (typeof value !== 'object' || value === null) {
    throw new RoleEnforcementExecutionError("Config module 'config' export must be an object.")
  }

  const required = ['include', 'ignorePatterns', 'layers', 'roles', 'roleDefinitionsDir']
  for (const key of required) {
    if (!(key in value)) {
      throw new RoleEnforcementExecutionError(`Config is missing required property '${key}'.`)
    }
  }
}
