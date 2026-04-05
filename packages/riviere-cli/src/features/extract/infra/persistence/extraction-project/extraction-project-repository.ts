import {
  existsSync, readFileSync 
} from 'node:fs'
import { createRequire } from 'node:module'
import {
  dirname, posix, resolve 
} from 'node:path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import type {
  ConfigLoader, DraftComponent 
} from '@living-architecture/riviere-extract-ts'
import { resolveConfig } from '@living-architecture/riviere-extract-ts'
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
import { detectChangedTypeScriptFiles } from '../../../../../platform/infra/external-clients/git/git-changed-files'
import { getRepositoryInfo } from '../../../../../platform/infra/external-clients/git/git-repository-info'
import { loadDraftComponentsFromFile } from '../../../../../platform/infra/external-clients/draft-components/draft-component-loader'
import {
  ExtractionProject, type ModuleContext 
} from '../../../domain/extraction-project'
import { createConfiguredProject } from '../../external-clients/ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../../external-clients/ts-morph/find-module-tsconfig-dir'

class ModuleRefNotFoundError extends Error {
  constructor(ref: string, filePath: string) {
    super(`Cannot resolve module reference '${ref}'. File not found: ${filePath}`)
    this.name = 'ModuleRefNotFoundError'
  }
}

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
      `Cannot resolve package '${packageName}'. Ensure the package is installed in node_modules.`,
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

const NOT_USED = { notUsed: true } as const

interface TopLevelRulesConfig {
  api?: Module['api']
  useCase?: Module['useCase']
  domainOp?: Module['domainOp']
  event?: Module['event']
  eventHandler?: Module['eventHandler']
  eventPublisher?: Module['eventPublisher']
  ui?: Module['ui']
}

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

/** @riviere-role aggregate-repository */
export class ExtractionProjectRepository {
  loadFromChangedProject(params: ChangedProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    const sourceFilePaths = this.resolveChangedSourceFilePaths(
      this.resolveSourceFilePaths(parsedConfigState),
      params.baseBranch,
    )
    return this.createExtractionProject(parsedConfigState, sourceFilePaths, params.useTsConfig)
  }

  loadFromDraftEnrichment(params: DraftEnrichmentParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    return this.createExtractionProject(
      parsedConfigState,
      this.resolveSourceFilePaths(parsedConfigState),
      params.useTsConfig,
      loadDraftComponentsFromFile(params.draftComponentsPath),
    )
  }

  loadFromFullProject(params: FullProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    return this.createExtractionProject(
      parsedConfigState,
      this.resolveSourceFilePaths(parsedConfigState),
      params.useTsConfig,
    )
  }

  loadFromSelectedFiles(params: SelectedFilesProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    const sourceFilePaths = this.resolveSelectedSourceFilePaths(
      this.resolveSourceFilePaths(parsedConfigState),
      params.filePaths,
    )
    return this.createExtractionProject(parsedConfigState, sourceFilePaths, params.useTsConfig)
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    if (!existsSync(configPath)) {
      throw new ConfigValidationError(
        CliErrorCode.ConfigNotFound,
        `Config file not found: ${configPath}`,
      )
    }

    const content = readFileSync(configPath, 'utf-8')
    const parsed = this.parseConfigFile(content)
    const configDir = dirname(resolve(configPath))
    const expanded = this.expandModuleRefs(parsed, configDir)

    if (!isValidExtractionConfig(expanded)) {
      const validationResult = validateExtractionConfig(expanded)
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
      )
    }

    return {
      configDir,
      resolvedConfig: resolveConfig(expanded, this.createExtendedConfigLoader(configDir)),
    }
  }

  private parseConfigFile(content: string): unknown {
    try {
      const parsed: unknown = parseYaml(content)
      return parsed
    } catch (error) {
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Invalid config file: ${String(error)}`,
      )
    }
  }

  private expandModuleRefs(config: unknown, configDir: string): unknown {
    try {
      if (!this.hasModulesArray(config)) {
        return config
      }

      return {
        ...config,
        modules: config.modules.map((item) => this.expandModuleRefItem(item, configDir)),
      }
    } catch (error) {
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Error expanding module references: ${String(error)}`,
      )
    }
  }

  private expandModuleRefItem(item: unknown, configDir: string): unknown {
    if (!this.isModuleRef(item)) {
      return item
    }

    const refPath = resolve(configDir, item.$ref)
    if (!existsSync(refPath)) {
      throw new ModuleRefNotFoundError(item.$ref, refPath)
    }

    const content = readFileSync(refPath, 'utf-8')
    const parsed: unknown = parseYaml(content)
    return parsed
  }

  private createExtendedConfigLoader(configDir: string): ConfigLoader {
    return (source: string): Module => {
      const filePath = this.resolveExtendedConfigPath(source, configDir)
      return this.loadExtendedConfigFile(filePath, source)
    }
  }

  private resolveExtendedConfigPath(source: string, configDir: string): string {
    return this.isPackageReference(source)
      ? this.resolvePackagePath(source, configDir)
      : resolve(configDir, source)
  }

  private isPackageReference(source: string): boolean {
    return !source.startsWith('.') && !source.startsWith('/')
  }

  private resolvePackagePath(packageName: string, configDir: string): string {
    const require = createRequire(resolve(configDir, 'package.json'))

    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`)
      const packageDir = dirname(packageJsonPath)
      const defaultConfigPath = resolve(packageDir, 'src/default-extraction.config.json')
      if (existsSync(defaultConfigPath)) {
        return defaultConfigPath
      }
      throw new PackageResolveError(packageName)
    } catch {
      throw new PackageResolveError(packageName)
    }
  }

  private loadExtendedConfigFile(filePath: string, source: string): Module {
    if (!existsSync(filePath)) {
      throw new ConfigFileNotFoundError(source, filePath)
    }

    const content = readFileSync(filePath, 'utf-8')
    return this.parseExtendedConfigContent(content, source)
  }

  private parseExtendedConfigContent(content: string, source: string): Module {
    const parsed: unknown = parseYaml(content)

    if (this.hasModulesArray(parsed)) {
      return this.resolveFirstModuleFromConfig(parsed, source)
    }

    if (this.isTopLevelRulesConfig(parsed)) {
      return this.topLevelRulesToModule(parsed)
    }

    const preview = JSON.stringify(parsed, null, 2).slice(0, 200)
    throw new InvalidConfigFormatError(source, preview)
  }

  private resolveFirstModuleFromConfig(parsed: { modules: unknown[] }, source: string): Module {
    if (parsed.modules.length === 0) {
      throw new ConfigSchemaValidationError(source, 'Config has empty modules array')
    }
    try {
      const config = parseExtractionConfig(parsed)
      const [first] = resolveConfig(config).modules
      /* v8 ignore start -- unreachable: schema enforces minItems:1 and pre-check guards length */
      if (first === undefined) {
        throw new ConfigSchemaValidationError(source, 'Config has empty modules array')
      }
      /* v8 ignore end */
      return first
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConfigSchemaValidationError(source, message)
    }
  }

  private isTopLevelRulesConfig(value: unknown): value is TopLevelRulesConfig {
    return (
      typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
    )
  }

  private topLevelRulesToModule(parsed: TopLevelRulesConfig): Module {
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

  private createExtractionProject(
    parsedConfigState: ParsedConfigState,
    sourceFilePaths: string[],
    useTsConfig: boolean,
    draftComponents: DraftComponent[] = [],
  ): ExtractionProject {
    return new ExtractionProject(
      parsedConfigState.configDir,
      this.createModuleContexts(
        parsedConfigState.configDir,
        parsedConfigState.resolvedConfig,
        sourceFilePaths,
        useTsConfig,
      ),
      parsedConfigState.resolvedConfig,
      getRepositoryInfo().name,
      draftComponents,
    )
  }

  private resolveSourceFilePaths(parsedConfigState: ParsedConfigState): string[] {
    const sourceFilePaths = parsedConfigState.resolvedConfig.modules
      .flatMap((module) =>
        globSync(posix.join(module.path, module.glob), { cwd: parsedConfigState.configDir }),
      )
      .map((filePath) => resolve(parsedConfigState.configDir, filePath))

    if (sourceFilePaths.length === 0) {
      const patterns = parsedConfigState.resolvedConfig.modules
        .map((module) => posix.join(module.path, module.glob))
        .join(', ')
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `No files matched extraction patterns: ${patterns}\nConfig directory: ${parsedConfigState.configDir}`,
      )
    }

    return sourceFilePaths
  }

  private resolveChangedSourceFilePaths(allSourceFiles: string[], baseBranch?: string): string[] {
    const gitOptions = baseBranch === undefined ? {} : { base: baseBranch }
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

  private createModuleContexts(
    configDir: string,
    resolvedConfig: ResolvedExtractionConfig,
    sourceFilePaths: string[],
    useTsConfig: boolean,
  ): ModuleContext[] {
    const sourceFileSet = new Set(sourceFilePaths)

    return resolvedConfig.modules.map((module) => {
      const allModuleFiles = globSync(posix.join(module.path, module.glob), { cwd: configDir }).map(
        (filePath) => resolve(configDir, filePath),
      )
      const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
      const moduleConfigDir = findModuleTsConfigDir(configDir, module.path)
      const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
      project.addSourceFilesAtPaths(moduleFiles)

      return {
        files: moduleFiles,
        module,
        project,
      }
    })
  }

  private hasModulesArray(value: unknown): value is { modules: unknown[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'modules' in value &&
      Array.isArray(value.modules)
    )
  }

  private isModuleRef(value: unknown): value is { $ref: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      '$ref' in value &&
      typeof value.$ref === 'string'
    )
  }
}
