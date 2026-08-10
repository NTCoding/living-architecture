import {
  readdirSync, realpathSync 
} from 'node:fs'
import type { findFilesMatchingPatterns } from '../../../platform/infra/external-clients/filesystem/find-files-matching-patterns'
import { findFilesMatchingPatterns as defaultFindFilesMatchingPatterns } from '../../../platform/infra/external-clients/filesystem/find-files-matching-patterns'
import type { RoleEnforcementResult } from '../domain/role-enforcement-builder'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-execution-error'
import { RoleEnforcementProject } from '../domain/role-enforcement-project'

type ReadDirectory = Parameters<typeof findFilesMatchingPatterns>[3]

const defaultDependencies = {
  findFilesMatchingPatterns: defaultFindFilesMatchingPatterns,
  readDirectory: defaultReadDirectory,
  realpath: (filePath: string) => realpathSync(filePath),
}

function defaultReadDirectory(
  rootDir: Parameters<ReadDirectory>[0],
  options: Parameters<ReadDirectory>[1],
): ReturnType<ReadDirectory> {
  return readdirSync(rootDir, options)
}

/** @riviere-role aggregate-repository */
export class RoleEnforcementProjectRepository {
  private readonly dependencies: typeof defaultDependencies

  constructor(dependencies: Partial<typeof defaultDependencies> = {}) {
    this.dependencies = {
      ...defaultDependencies,
      ...dependencies,
    }
  }

  load(configModule: unknown, configDir: string): RoleEnforcementProject {
    const config = readConfig(configModule)
    const canonicalConfigDir = this.dependencies.realpath(configDir)
    const lintTargets = this.dependencies.findFilesMatchingPatterns(
      canonicalConfigDir,
      config.include,
      config.ignorePatterns,
      this.dependencies.readDirectory,
    )
    return new RoleEnforcementProject(config, canonicalConfigDir, lintTargets)
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
