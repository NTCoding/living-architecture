import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, posix, resolve } from 'node:path'
import { globSync } from 'glob'
import { parse as parseYaml } from 'yaml'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { type ConfigLoader, resolveConfig } from '@living-architecture/riviere-extract-ts'
import {
  formatValidationErrors,
  isValidExtractionConfig,
  parseExtractionConfig,
  type Module,
  type ResolvedExtractionConfig,
  validateExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import {
  CliErrorCode,
  ConfigValidationError,
} from '../../../../../platform/infra/cli/presentation/error-codes'
import { loadDraftComponentsFromFile } from '../../../../../platform/infra/extraction-config/draft-component-loader'
import { detectChangedTypeScriptFiles } from '../../../../../platform/infra/external-clients/git/git-changed-files'
import { getRepositoryInfo } from '../../../../../platform/infra/external-clients/git/git-repository-info'
import { ExtractionProject, type ModuleContext } from '../../../domain/extraction-project'
import { createConfiguredProject } from '../../external-clients/ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../../external-clients/ts-morph/find-module-tsconfig-dir'

interface FullProjectParams {
  configPath: string
  useTsConfig: boolean
}

interface ChangedProjectParams {
  baseBranch?: string
  configPath: string
  useTsConfig: boolean
}

interface SelectedFilesProjectParams {
  configPath: string
  filePaths: string[]
  useTsConfig: boolean
}

interface DraftEnrichmentParams {
  configPath: string
  draftComponentsPath: string
  useTsConfig: boolean
}

type ParsedConfigState = {
  configDir: string
  resolvedConfig: ResolvedExtractionConfig
}

interface TopLevelRulesConfig {
  api?: Module['api']
  useCase?: Module['useCase']
  domainOp?: Module['domainOp']
  event?: Module['event']
  eventHandler?: Module['eventHandler']
  eventPublisher?: Module['eventPublisher']
  ui?: Module['ui']
}

interface ValidatedConfig {
  resolvedConfig: ResolvedExtractionConfig
  configDir: string
}

type ParseResult =
  | {
      success: true
      data: unknown
    }
  | {
      success: false
      error: string
    }

const NOT_USED = { notUsed: true } as const

class ConfigSchemaValidationError extends Error {
  constructor(source: string, details: string) {
    super(`Invalid extended config in '${source}': ${details}`)
    this.name = 'ConfigSchemaValidationError'
  }
}

class InvalidConfigFormatError extends Error {
  constructor(source: string, preview: string) {
    super(
      `Invalid extended config format in '${source}'. ` +
        `Expected object with 'modules' array or top-level component rules. Got: ${preview}`,
    )
    this.name = 'InvalidConfigFormatError'
  }
}

class PackageResolveError extends Error {
  constructor(packageName: string) {
    super(
      `Cannot resolve package '${packageName}'. ` +
        'Ensure the package is installed in node_modules.',
    )
    this.name = 'PackageResolveError'
  }
}

class ConfigFileNotFoundError extends Error {
  constructor(source: string, filePath: string) {
    super(`Cannot resolve extends reference '${source}'. File not found: ${filePath}`)
    this.name = 'ConfigFileNotFoundError'
  }
}

class InternalSchemaValidationError extends Error {
  constructor() {
    super('Config has empty modules array (schema validation should prevent this)')
    this.name = 'InternalSchemaValidationError'
  }
}

class ModuleRefNotFoundError extends Error {
  constructor(ref: string, filePath: string) {
    super(`Cannot resolve module reference '${ref}'. File not found: ${filePath}`)
    this.name = 'ModuleRefNotFoundError'
  }
}

class PackageConfigNotFoundError extends Error {
  constructor(packageName: string) {
    super(
      `Package '${packageName}' does not contain 'src/default-extraction.config.json'. ` +
        'Ensure the package exports a default extraction config.',
    )
    this.name = 'PackageConfigNotFoundError'
  }
}

/** @riviere-role aggregate-repository */
export class ExtractionProjectRepository {
  loadFromChangedProject(loadChangedProjectParams: ChangedProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(loadChangedProjectParams.configPath)
    const sourceFilePaths = this.resolveChangedSourceFilePaths(
      this.resolveSourceFilePaths(parsedConfigState),
      loadChangedProjectParams.baseBranch === undefined
        ? { pr: true }
        : {
            base: loadChangedProjectParams.baseBranch,
            pr: true,
          },
    )
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilePaths,
      loadChangedProjectParams.useTsConfig,
    )
  }

  loadFromDraftEnrichment(draftEnrichmentParams: DraftEnrichmentParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(draftEnrichmentParams.configPath)
    return this.createExtractionProject(
      parsedConfigState,
      this.resolveSourceFilePaths(parsedConfigState),
      draftEnrichmentParams.useTsConfig,
      loadDraftComponentsFromFile(draftEnrichmentParams.draftComponentsPath),
    )
  }

  loadFromFullProject(loadFullProjectParams: FullProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(loadFullProjectParams.configPath)
    return this.createExtractionProject(
      parsedConfigState,
      this.resolveSourceFilePaths(parsedConfigState),
      loadFullProjectParams.useTsConfig,
    )
  }

  loadFromSelectedFiles(selectedFilesProjectParams: SelectedFilesProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(selectedFilesProjectParams.configPath)
    const sourceFilePaths = this.resolveSelectedSourceFilePaths(
      this.resolveSourceFilePaths(parsedConfigState),
      selectedFilesProjectParams.filePaths,
    )
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilePaths,
      selectedFilesProjectParams.useTsConfig,
    )
  }

  private createExtractionProject(
    parsedConfigState: ParsedConfigState,
    sourceFilePaths: string[],
    useTsConfig: boolean,
    draftComponents: DraftComponent[] = [],
  ): ExtractionProject {
    return new ExtractionProject(
      parsedConfigState.configDir,
      this.createModuleContexts(parsedConfigState, sourceFilePaths, useTsConfig),
      parsedConfigState.resolvedConfig,
      getRepositoryInfo().name,
      draftComponents,
    )
  }

  private createModuleContexts(
    parsedConfigState: ParsedConfigState,
    sourceFilePaths: string[],
    useTsConfig: boolean,
  ): ModuleContext[] {
    const sourceFileSet = new Set(sourceFilePaths)

    return parsedConfigState.resolvedConfig.modules.map((module) => {
      const allModuleFiles = globSync(posix.join(module.path, module.glob), {
        cwd: parsedConfigState.configDir,
      }).map((filePath) => resolve(parsedConfigState.configDir, filePath))
      const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
      const moduleConfigDir = findModuleTsConfigDir(parsedConfigState.configDir, module.path)
      const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
      project.addSourceFilesAtPaths(moduleFiles)

      return {
        files: moduleFiles,
        module,
        project,
      }
    })
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    return loadAndValidateConfig(configPath)
  }

  private resolveSourceFilePaths(parsedConfigState: ParsedConfigState): string[] {
    return resolveSourceFiles(parsedConfigState.resolvedConfig, parsedConfigState.configDir)
  }

  private resolveChangedSourceFilePaths(
    allSourceFiles: string[],
    options: { pr: true; base?: string },
  ): string[] {
    const gitOptions = options.base === undefined ? {} : { base: options.base }
    const result = detectChangedTypeScriptFiles(process.cwd(), gitOptions)
    for (const warning of result.warnings) {
      console.error(warning)
    }
    const changedAbsolute = new Set(result.files.map((filePath) => resolve(filePath)))
    return allSourceFiles.filter((filePath) => changedAbsolute.has(filePath))
  }

  private resolveSelectedSourceFilePaths(
    allSourceFiles: string[],
    requestedFiles: string[],
  ): string[] {
    const missingFiles = requestedFiles.filter((filePath) => !existsSync(resolve(filePath)))
    if (missingFiles.length > 0) {
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Files not found: ${missingFiles.join(', ')}`,
      )
    }

    const requestedAbsolute = new Set(requestedFiles.map((filePath) => resolve(filePath)))
    return allSourceFiles.filter((filePath) => requestedAbsolute.has(filePath))
  }
}

function topLevelRulesToModule(parsed: TopLevelRulesConfig): Module {
  return {
    name: 'extended',
    path: '.',
    glob: '**',
    api: parsed.api ?? NOT_USED,
    useCase: parsed.useCase ?? NOT_USED,
    domainOp: parsed.domainOp ?? NOT_USED,
    event: parsed.event ?? NOT_USED,
    eventHandler: parsed.eventHandler ?? NOT_USED,
    eventPublisher: parsed.eventPublisher ?? NOT_USED,
    ui: parsed.ui ?? NOT_USED,
  }
}

function hasModulesArray(value: unknown): value is { modules: unknown[] } {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (!('modules' in value)) {
    return false
  }
  return Array.isArray(value.modules)
}

function isTopLevelRulesConfig(value: unknown): value is TopLevelRulesConfig {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
  )
}

function parseConfigContent(content: string, source: string): Module {
  const parsed: unknown = parseYaml(content)

  if (hasModulesArray(parsed)) {
    try {
      const config = parseExtractionConfig(parsed)
      const resolved = resolveConfig(config)
      const firstModule = resolved.modules[0]
      if (firstModule === undefined) {
        throw new InternalSchemaValidationError()
      }
      return firstModule
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConfigSchemaValidationError(source, message)
    }
  }

  if (isTopLevelRulesConfig(parsed)) {
    return topLevelRulesToModule(parsed)
  }

  const preview = JSON.stringify(parsed, null, 2).slice(0, 200)
  throw new InvalidConfigFormatError(source, preview)
}

function isPackageReference(source: string): boolean {
  return !source.startsWith('.') && !source.startsWith('/')
}

function resolvePackagePath(packageName: string, configDir: string): string {
  const require = createRequire(resolve(configDir, 'package.json'))
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`)
    const packageDir = dirname(packageJsonPath)
    const defaultConfigPath = resolve(packageDir, 'src/default-extraction.config.json')
    if (existsSync(defaultConfigPath)) {
      return defaultConfigPath
    }
    throw new PackageConfigNotFoundError(packageName)
  } catch (error) {
    if (error instanceof PackageConfigNotFoundError) {
      throw error
    }
    throw new PackageResolveError(packageName)
  }
}

function loadConfigFile(filePath: string, source: string): Module {
  if (!existsSync(filePath)) {
    throw new ConfigFileNotFoundError(source, filePath)
  }

  const content = readFileSync(filePath, 'utf-8')
  return parseConfigContent(content, source)
}

function createConfigLoader(configDir: string): ConfigLoader {
  return (source: string): Module => {
    const filePath = isPackageReference(source)
      ? resolvePackagePath(source, configDir)
      : resolve(configDir, source)

    return loadConfigFile(filePath, source)
  }
}

function parseConfigFile(content: string): ParseResult {
  try {
    return {
      success: true,
      data: parseYaml(content),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error'
    return {
      success: false,
      error: message,
    }
  }
}

function isModuleRef(value: unknown): value is { $ref: string } {
  return (
    typeof value === 'object' && value !== null && '$ref' in value && typeof value.$ref === 'string'
  )
}

function expandModuleRefs(config: unknown, configDir: string): unknown {
  if (!hasModulesArray(config)) {
    return config
  }

  const expandedModules = config.modules.map((item: unknown) => {
    if (!isModuleRef(item)) {
      return item
    }

    const refPath = resolve(configDir, item.$ref)
    if (!existsSync(refPath)) {
      throw new ModuleRefNotFoundError(item.$ref, refPath)
    }

    const content = readFileSync(refPath, 'utf-8')
    return parseYaml(content) as unknown
  })

  return {
    ...config,
    modules: expandedModules,
  }
}

function tryExpandModuleRefs(data: unknown, configDir: string): ParseResult {
  try {
    return {
      success: true,
      data: expandModuleRefs(data, configDir),
    }
  } catch (error) {
    if (error instanceof ModuleRefNotFoundError) {
      return {
        success: false,
        error: error.message,
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error during module expansion'
    return {
      success: false,
      error: message,
    }
  }
}

function resolveSourceFiles(resolvedConfig: ResolvedExtractionConfig, configDir: string): string[] {
  const sourceFilePaths = resolvedConfig.modules
    .flatMap((module) => globSync(posix.join(module.path, module.glob), { cwd: configDir }))
    .map((filePath) => resolve(configDir, filePath))

  if (sourceFilePaths.length === 0) {
    const patterns = resolvedConfig.modules.map((m) => posix.join(m.path, m.glob)).join(', ')
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `No files matched extraction patterns: ${patterns}\nConfig directory: ${configDir}`,
    )
  }

  return sourceFilePaths
}

function loadAndValidateConfig(configPath: string): ValidatedConfig {
  if (!existsSync(configPath)) {
    throw new ConfigValidationError(
      CliErrorCode.ConfigNotFound,
      `Config file not found: ${configPath}`,
    )
  }

  const content = readFileSync(configPath, 'utf-8')
  const parseResult = parseConfigFile(content)

  if (!parseResult.success) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Invalid config file: ${parseResult.error}`,
    )
  }

  const configDir = dirname(resolve(configPath))
  const expansionResult = tryExpandModuleRefs(parseResult.data, configDir)

  if (!expansionResult.success) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Error expanding module references: ${expansionResult.error}`,
    )
  }

  if (!isValidExtractionConfig(expansionResult.data)) {
    const validationResult = validateExtractionConfig(expansionResult.data)
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
    )
  }

  return {
    resolvedConfig: resolveConfig(expansionResult.data, createConfigLoader(configDir)),
    configDir,
  }
}
