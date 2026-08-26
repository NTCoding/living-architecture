import { readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import {
  RoleEnforcementConfiguration,
  RoleEnforcementProject,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import type { findFilesMatchingPatterns } from '../../../../infra/external-clients/filesystem/find-files-matching-patterns'
import { findFilesMatchingPatterns as defaultFindFilesMatchingPatterns } from '../../../../infra/external-clients/filesystem/find-files-matching-patterns'
import { readWorkspacePackagePatterns as defaultReadWorkspacePackagePatterns } from '../../../../infra/external-clients/filesystem/read-workspace-package-patterns'
import { readWorkspacePackageManifest as defaultReadWorkspacePackageManifest } from '../../../../infra/external-clients/filesystem/read-workspace-package-manifest'
import { loadTypeScriptModule as defaultLoadTypeScriptModule } from '../../../../infra/external-clients/typescript/load-typescript-module'
import { RoleEnforcementProjectLoadError } from './role-enforcement-project-load-error'

type ReadDirectory = Parameters<typeof findFilesMatchingPatterns>[3]

const defaultDependencies = {
  findFilesMatchingPatterns: defaultFindFilesMatchingPatterns,
  loadTypeScriptModule: defaultLoadTypeScriptModule,
  readDirectory: defaultReadDirectory,
  readRoleDefinitionFileNames: defaultReadRoleDefinitionFileNames,
  readWorkspacePackageManifest: defaultReadWorkspacePackageManifest,
  readWorkspacePackagePatterns: defaultReadWorkspacePackagePatterns,
  realpath: (filePath: string) => realpathSync(filePath),
}

function defaultReadDirectory(
  rootDir: Parameters<ReadDirectory>[0],
  options: Parameters<ReadDirectory>[1],
): ReturnType<ReadDirectory> {
  return readdirSync(rootDir, options)
}

function defaultReadRoleDefinitionFileNames(directoryPath: string): readonly string[] {
  return readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
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

  load(configModulePath: string, configDir: string): RoleEnforcementProject {
    const canonicalConfigDir = this.dependencies.realpath(configDir)
    const config = readConfig(
      this.dependencies.loadTypeScriptModule(path.resolve(canonicalConfigDir, configModulePath)),
    )
    validateRoleDefinitionFiles(
      config,
      this.dependencies.readRoleDefinitionFileNames(
        path.resolve(canonicalConfigDir, config.roleDefinitionsDir),
      ),
    )
    const workspacePatterns = this.dependencies.readWorkspacePackagePatterns(canonicalConfigDir)
    const packagePatterns = workspacePatterns ?? packagePatternsFromConfiguration(config)
    const workspacePackageManifests = this.dependencies.findFilesMatchingPatterns(
      canonicalConfigDir,
      packagePatterns.include.map((pattern) => `${withoutTrailingSlash(pattern)}/package.json`),
      packagePatterns.ignore.map((pattern) => `${withoutTrailingSlash(pattern)}/package.json`),
      this.dependencies.readDirectory,
    )
    config.validateWorkspacePackages(
      workspacePackageManifests.map((manifestPath) => ({
        manifest: this.dependencies.readWorkspacePackageManifest(
          path.resolve(canonicalConfigDir, manifestPath),
        ),
        path: path.posix.dirname(manifestPath),
      })),
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

function validateRoleDefinitionFiles(
  config: RoleEnforcementConfiguration,
  fileNames: readonly string[],
): void {
  const definitionFiles = fileNames.filter(
    (fileName) => fileName.endsWith('.md') && fileName !== 'index.md',
  )
  const definedRoles = new Set(definitionFiles.map((fileName) => fileName.slice(0, -3)))
  for (const configuredRole of config.roles) {
    if (!definedRoles.has(configuredRole.name)) {
      throw new RoleEnforcementProjectLoadError(
        `Role '${configuredRole.name}' has no definition file at '${config.roleDefinitionsDir}/${configuredRole.name}.md'.`,
      )
    }
  }
  const configuredRoles = new Set(config.roles.map((role) => role.name))
  for (const definitionFile of definitionFiles) {
    const roleName = definitionFile.slice(0, -3)
    if (!configuredRoles.has(roleName)) {
      throw new RoleEnforcementProjectLoadError(
        `Role definition '${definitionFile}' has no configured role.`,
      )
    }
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
  const parsed = RoleEnforcementConfiguration.parseFromUnknown(exportedConfiguration)
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
