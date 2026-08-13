import { readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type { findFilesMatchingPatterns } from '../../../../platform/infra/external-clients/filesystem/find-files-matching-patterns'
import { findFilesMatchingPatterns as defaultFindFilesMatchingPatterns } from '../../../../platform/infra/external-clients/filesystem/find-files-matching-patterns'
import { RoleEnforcementConfiguration } from '../../domain/role-enforcement-builder'
import { RoleEnforcementProject } from '../../domain/role-enforcement-project'

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
    const packageRoots = findPackageRoots(config)
    const workspacePackageManifests = this.dependencies.findFilesMatchingPatterns(
      canonicalConfigDir,
      packageRoots.map((root) => `${root}/*/package.json`),
      [],
      this.dependencies.readDirectory,
    )
    config.validateWorkspacePackages(
      workspacePackageManifests.map((manifestPath) => path.posix.dirname(manifestPath)),
    )
    const lintTargets = this.dependencies.findFilesMatchingPatterns(
      canonicalConfigDir,
      config.include,
      config.ignorePatterns,
      this.dependencies.readDirectory,
    )
    return new RoleEnforcementProject(config, canonicalConfigDir, lintTargets)
  }
}

function findPackageRoots(config: RoleEnforcementConfiguration): string[] {
  return [
    ...new Set(
      [...config.assignedPackages, ...config.unassignedPackages].map(
        (packagePath) => packagePath.split('/')[0],
      ),
    ),
  ].filter((root): root is string => root !== undefined && root.length > 0)
}

function readConfig(configModule: unknown): RoleEnforcementConfiguration {
  const exportedConfiguration = readConfigExport(resolveModuleExports(configModule))
  const parsed = RoleEnforcementConfiguration.parse(exportedConfiguration)
  if (!parsed.success) {
    throw parsed.error
  }
  return parsed.data
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

function readConfigExport(moduleExports: unknown): unknown {
  if (typeof moduleExports === 'object' && moduleExports !== null && 'config' in moduleExports) {
    return moduleExports.config
  }
  return undefined
}
