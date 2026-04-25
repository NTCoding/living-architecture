import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import { parse as parseYaml } from 'yaml'
import * as ExtractTs from '@living-architecture/riviere-extract-ts'
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
import { getRepositoryInfo } from '../../../../../platform/infra/external-clients/git/git-repository-info'
import { loadDraftComponentsFromFile } from '../../../../../platform/infra/external-clients/draft-components/draft-component-loader'
import { ExtractionProject } from '../../../domain/extraction-project'
import {
  createModuleContexts,
  extractionProjectGlobMatcher,
  resolveChangedSourceFilePaths,
  resolveSelectedSourceFilePaths,
  resolveSourceFilePaths,
} from '../../external-clients/source-files/extraction-project-source-files'

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
  constructor(packageName: string, cause?: unknown) {
    const baseMessage = `Cannot resolve package '${packageName}'. Ensure the package is installed in node_modules.`
    const message = cause instanceof Error ? `${baseMessage} Cause: ${cause.message}` : baseMessage
    super(message, cause instanceof Error ? { cause } : undefined)
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
    const sourceFilesByModule = resolveSourceFilePaths(parsedConfigState)
    const sourceFilePaths = resolveChangedSourceFilePaths(
      [...sourceFilesByModule.values()].flat(),
      params.baseBranch,
    )
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilesByModule,
      sourceFilePaths,
      params.useTsConfig,
    )
  }

  loadFromDraftEnrichment(params: DraftEnrichmentParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    const sourceFilesByModule = resolveSourceFilePaths(parsedConfigState)
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilesByModule,
      [...sourceFilesByModule.values()].flat(),
      params.useTsConfig,
      loadDraftComponentsFromFile(params.draftComponentsPath),
    )
  }

  loadFromFullProject(params: FullProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    const sourceFilesByModule = resolveSourceFilePaths(parsedConfigState)
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilesByModule,
      [...sourceFilesByModule.values()].flat(),
      params.useTsConfig,
    )
  }

  loadFromSelectedFiles(params: SelectedFilesProjectParams): ExtractionProject {
    const parsedConfigState = this.loadParsedConfigState(params.configPath)
    const sourceFilesByModule = resolveSourceFilePaths(parsedConfigState)
    const sourceFilePaths = resolveSelectedSourceFilePaths(
      [...sourceFilesByModule.values()].flat(),
      params.filePaths,
      parsedConfigState.configDir,
    )
    return this.createExtractionProject(
      parsedConfigState,
      sourceFilesByModule,
      sourceFilePaths,
      params.useTsConfig,
    )
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    if (!fs.existsSync(configPath)) {
      throw new ConfigValidationError(
        CliErrorCode.ConfigNotFound,
        `Config file not found: ${configPath}`,
      )
    }

    const content = fs.readFileSync(configPath, 'utf-8')
    const parsed = this.parseConfigFile(content)
    const configDir = path.dirname(path.resolve(configPath))
    const expanded = this.expandModuleRefs(parsed, configDir)

    if (!isValidExtractionConfig(expanded)) {
      const validationResult = validateExtractionConfig(expanded)
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Invalid extraction config:
${formatValidationErrors(validationResult.errors)}`,
      )
    }

    return {
      configDir,
      resolvedConfig: ExtractTs.resolveConfig(expanded, this.createExtendedConfigLoader(configDir)),
    }
  }

  private parseConfigFile(content: string): unknown {
    try {
      return parseYaml(content)
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

    const refPath = path.resolve(configDir, item.$ref)
    if (!fs.existsSync(refPath)) {
      throw new ModuleRefNotFoundError(item.$ref, refPath)
    }

    const content = fs.readFileSync(refPath, 'utf-8')
    return parseYaml(content)
  }

  private createExtendedConfigLoader(configDir: string): ExtractTs.ConfigLoader {
    return (source: string): Module => {
      const filePath = this.resolveExtendedConfigPath(source, configDir)
      return this.loadExtendedConfigFile(filePath, source)
    }
  }

  private resolveExtendedConfigPath(source: string, configDir: string): string {
    return this.isPackageReference(source)
      ? this.resolvePackagePath(source, configDir)
      : path.resolve(configDir, source)
  }

  private isPackageReference(source: string): boolean {
    return !source.startsWith('.') && !source.startsWith('/')
  }

  private resolvePackagePath(packageName: string, configDir: string): string {
    const require = createRequire(path.resolve(configDir, 'package.json'))

    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`)
      const packageDir = path.dirname(packageJsonPath)
      const defaultConfigPath = path.resolve(packageDir, 'src/default-extraction.config.json')
      if (fs.existsSync(defaultConfigPath)) {
        return defaultConfigPath
      }
      throw new PackageResolveError(packageName)
    } catch (error) {
      if (error instanceof PackageResolveError) {
        throw error
      }
      throw new PackageResolveError(packageName, error)
    }
  }

  private loadExtendedConfigFile(filePath: string, source: string): Module {
    if (!fs.existsSync(filePath)) {
      throw new ConfigFileNotFoundError(source, filePath)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
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
      const [first] = ExtractTs.resolveConfig(config).modules
      /* v8 ignore start -- schema+resolveConfig guarantee at least one module here */
      if (first === undefined) {
        throw new ConfigSchemaValidationError(source, 'Config has empty modules array')
      }
      /* v8 ignore stop */
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
      domain: 'extended',
      name: 'extended',
      path: '.',
      glob: '**',
      api: parsed.api ?? NOT_USED,
      useCase: parsed.useCase ?? NOT_USED,
      domainOp: parsed.domainOp ?? NOT_USED,
      event: parsed.event ?? NOT_USED,
      eventHandler: parsed.eventHandler ?? NOT_USED,
      ui: parsed.ui ?? NOT_USED,
    }
  }

  private createExtractionProject(
    parsedConfigState: ParsedConfigState,
    sourceFilesByModule: Map<ExtractConfig.Module, string[]>,
    sourceFilePaths: string[],
    useTsConfig: boolean,
    draftComponents: ExtractTs.DraftComponent[] = [],
  ): ExtractionProject {
    return new ExtractionProject(
      parsedConfigState.configDir,
      createModuleContexts(
        parsedConfigState.configDir,
        parsedConfigState.resolvedConfig,
        sourceFilesByModule,
        sourceFilePaths,
        useTsConfig,
      ),
      parsedConfigState.resolvedConfig,
      getRepositoryInfo().name,
      draftComponents,
      extractionProjectGlobMatcher,
    )
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
