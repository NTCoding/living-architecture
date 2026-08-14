import { readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import {
  RoleEnforcementConfiguration,
  RoleEnforcementProject,
} from '@living-architecture/riviere-role-enforcement'
import type { findFilesMatchingPatterns } from '../../../../infra/external-clients/filesystem/find-files-matching-patterns'
import { findFilesMatchingPatterns as defaultFindFilesMatchingPatterns } from '../../../../infra/external-clients/filesystem/find-files-matching-patterns'
import { readWorkspacePackagePatterns as defaultReadWorkspacePackagePatterns } from '../../../../infra/external-clients/filesystem/read-workspace-package-patterns'

type ReadDirectory = Parameters<typeof findFilesMatchingPatterns>[3]

const defaultDependencies = {
  findFilesMatchingPatterns: defaultFindFilesMatchingPatterns,
  readDirectory: defaultReadDirectory,
  readWorkspacePackagePatterns: defaultReadWorkspacePackagePatterns,
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
    const workspacePatterns = this.dependencies.readWorkspacePackagePatterns(canonicalConfigDir)
    const packagePatterns = workspacePatterns ?? packagePatternsFromConfiguration(config)
    const workspacePackageManifests = this.dependencies.findFilesMatchingPatterns(
      canonicalConfigDir,
      packagePatterns.include.map((pattern) => `${withoutTrailingSlash(pattern)}/package.json`),
      packagePatterns.ignore.map((pattern) => `${withoutTrailingSlash(pattern)}/package.json`),
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

function packagePatternsFromConfiguration(config: RoleEnforcementConfiguration) {
  const packageRoots = [
    ...new Set(
      [...config.assignedPackages, ...config.unassignedPackages].map(
        (packagePath) => packagePath.split('/')[0],
      ),
    ),
  ].filter((root): root is string => root !== undefined && root.length > 0)
  return {
    include: packageRoots.flatMap((root) => [`${root}/*`, `${root}/*/*`]),
    ignore: [],
  }
}

function withoutTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
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
