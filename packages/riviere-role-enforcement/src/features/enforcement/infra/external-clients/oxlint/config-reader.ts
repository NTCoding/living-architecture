import { filterConfigByPackage } from '../../../domain/filter-config-by-package'
import { RoleEnforcementExecutionError } from './run-role-enforcement'
import type { RoleEnforcementResult } from '../../../domain/role-enforcement-builder'

/** @riviere-role external-client-service */
export function readConfigForPackage(
  configModule: unknown,
  packageFilter: string,
): RoleEnforcementResult {
  return filterConfigByPackage(readConfig(configModule), packageFilter)
}

/** @riviere-role external-client-service */
export function readConfig(configModule: unknown): RoleEnforcementResult {
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
