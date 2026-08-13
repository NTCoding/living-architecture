import { dirname, posix, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import { DraftComponent } from '@living-architecture/riviere-extract-ts/domain/component-extraction/draft-component'
import {
  type DraftConfiguration,
  type DraftModule,
  parseExtractionConfig,
  type ValidatedModuleInput,
  type ValidatedModule,
  ValidatedConfiguration,
  type ValidationError,
} from '@living-architecture/riviere-extract-config'
import {
  FileReadError,
  readJsonFile,
  readTextFile,
} from '../../../../infra/external-clients/filesystem/file-reader'
import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import { resolveFileOrPackagePath } from '../../../../infra/external-clients/node-modules/node-module-file-resolver'
import { detectChangedTypeScriptFiles } from '../../../../infra/external-clients/git/git-changed-files'
import { GitError } from '../../../../infra/external-clients/git/git-errors'
import { getRepositoryInfo } from '../../../../infra/external-clients/git/git-repository-info'
import { ExtractionProject } from '@living-architecture/riviere-extract-ts/domain/extraction-project'
import { createConfiguredProject } from '../../../../infra/external-clients/ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../../../../infra/external-clients/ts-morph/find-module-tsconfig-dir'
import { ExtractionConfigError } from './extraction-config-error'
import { ExtractionDataAccessError } from './extraction-project-error'

class ExtractionConfigLoadError extends Error {}
type FullProjectParams = { configPath: string; useTsConfig: boolean }

type ChangedProjectParams = FullProjectParams & { baseBranch?: string }

type SelectedFilesProjectParams = FullProjectParams & { filePaths: string[] }
type DraftEnrichmentParams = FullProjectParams & { draftComponentsPath: string }
type ParsedConfigState = Readonly<{ configDir: string; configuration: ValidatedConfiguration }>
type DraftComponentInput = Parameters<typeof DraftComponent.parse>[0]
type ResolvedModuleDefaults = Pick<
  ValidatedModuleInput,
  'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui' | 'customTypes'
>

const NOT_USED = { notUsed: true } as const

function formatExtractionConfigErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return 'validation failed without specific errors'
  return errors.map((error) => `${error.path}: ${error.message}`).join('\n')
}

/** @riviere-role aggregate-repository */
export class ExtractionProjectRepository {
  loadFromChangedProject(params: ChangedProjectParams): ExtractionProject {
    return this.translateDataAccessErrors(() => {
      const parsedConfigState = this.loadParsedConfigState(params.configPath)
      const sourceFilePaths = this.resolveChangedSourceFilePaths(
        this.resolveSourceFilePaths(parsedConfigState),
        params.baseBranch,
      )
      return this.createExtractionProject(parsedConfigState, sourceFilePaths, params.useTsConfig)
    })
  }

  loadFromDraftEnrichment(params: DraftEnrichmentParams): ExtractionProject {
    return this.translateDataAccessErrors(() => {
      const parsedConfigState = this.loadParsedConfigState(params.configPath)
      return this.createExtractionProject(
        parsedConfigState,
        this.resolveSourceFilePaths(parsedConfigState),
        params.useTsConfig,
        this.loadDraftComponentsFromFile(params.draftComponentsPath),
      )
    })
  }

  loadFromFullProject(params: FullProjectParams): ExtractionProject {
    return this.translateDataAccessErrors(() => {
      const parsedConfigState = this.loadParsedConfigState(params.configPath)
      return this.createExtractionProject(
        parsedConfigState,
        this.resolveSourceFilePaths(parsedConfigState),
        params.useTsConfig,
      )
    })
  }

  loadFromSelectedFiles(params: SelectedFilesProjectParams): ExtractionProject {
    return this.translateDataAccessErrors(() => {
      const parsedConfigState = this.loadParsedConfigState(params.configPath)
      const sourceFilePaths = this.resolveSelectedSourceFilePaths(
        this.resolveSourceFilePaths(parsedConfigState),
        params.filePaths,
      )
      return this.createExtractionProject(parsedConfigState, sourceFilePaths, params.useTsConfig)
    })
  }

  private translateDataAccessErrors<T>(load: () => T): T {
    try {
      return load()
    } catch (error) {
      if (error instanceof GitError) {
        throw new ExtractionDataAccessError(error.gitErrorCode, error.message)
      }
      if (error instanceof FileReadError) {
        throw new ExtractionDataAccessError('FILE_READ_ERROR', error.message)
      }
      throw error
    }
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    if (!fileExists(configPath))
      throw new ExtractionConfigError('CONFIG_NOT_FOUND', `Config file not found: ${configPath}`)

    const content = readTextFile(configPath)
    const parsed = this.parseConfigFile(content)
    const configDir = dirname(resolve(configPath))
    const expanded = this.expandModuleRefs(parsed, configDir)

    const extractionConfig = parseExtractionConfig(expanded)
    if (!extractionConfig.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid extraction config:\n${formatExtractionConfigErrors(extractionConfig.errors)}`,
      )

    return {
      configDir,
      configuration: this.resolveConfiguration(extractionConfig.configuration, configDir),
    }
  }

  private parseConfigFile(content: string): unknown {
    try {
      return parseYaml(content)
    } catch (error) {
      throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${String(error)}`)
    }
  }

  private expandModuleRefs(config: unknown, configDir: string): unknown {
    try {
      if (!this.hasModulesArray(config)) return config

      return {
        ...config,
        modules: config.modules.map((item) => this.expandModuleRefItem(item, configDir)),
      }
    } catch (error) {
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Error expanding module references: ${String(error)}`,
      )
    }
  }

  private expandModuleRefItem(item: unknown, configDir: string): unknown {
    if (!this.isModuleRef(item)) {
      return item
    }

    const refPath = resolve(configDir, item.$ref)
    if (!fileExists(refPath))
      throw new ExtractionConfigLoadError(
        `Cannot resolve module reference '${item.$ref}'. File not found: ${refPath}`,
      )

    const content = readTextFile(refPath)
    const parsed: unknown = parseYaml(content)
    return parsed
  }

  private resolveConfiguration(
    config: DraftConfiguration,
    configDir: string,
  ): ValidatedConfiguration {
    const result = ValidatedConfiguration.parse({
      ...config,
      modules: config.modules.map((module) => this.resolveModule(module, configDir)),
    })
    if (!result.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        formatExtractionConfigErrors(result.errors),
      )
    return result.data
  }

  private loadDraftComponentsFromFile(filePath: string): DraftComponent[] {
    const parsed = readJsonFile(filePath, 'Enrich file')
    if (!this.isDraftComponentArray(parsed))
      throw new FileReadError(`Enrich file does not contain valid draft components: ${filePath}`)
    return parsed.map((component) => DraftComponent.parse(component))
  }

  private loadExtendedModule(source: string, configDir: string): ResolvedModuleDefaults {
    const filePath = resolveFileOrPackagePath({
      baseDirectory: configDir,
      packageRelativePath: 'src/default-extraction.config.json',
      source,
    })
    if (!fileExists(filePath))
      throw new ExtractionConfigLoadError(
        `Cannot resolve extends reference '${source}'. File not found: ${filePath}`,
      )

    const parsed: unknown = parseYaml(readTextFile(filePath))
    if (this.hasModulesArray(parsed)) {
      return this.resolveFirstModuleFromConfig(parsed, source, dirname(filePath))
    }
    if (this.isTopLevelRulesConfig(parsed)) {
      return this.topLevelRulesToModule(parsed)
    }
    const preview = JSON.stringify(parsed, null, 2).slice(0, 200)
    throw new ExtractionConfigLoadError(
      `Invalid extended config format in '${source}'. ` +
        `Expected object with 'modules' array or top-level component rules. Got: ${preview}`,
    )
  }

  private resolveFirstModuleFromConfig(
    parsed: { modules: unknown[] },
    source: string,
    configDir: string,
  ): ValidatedModuleInput {
    if (parsed.modules.length === 0)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': Config has empty modules array`,
      )

    const extractionConfig = parseExtractionConfig(parsed)
    if (!extractionConfig.success)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': ` +
          formatExtractionConfigErrors(extractionConfig.errors),
      )

    const [first] = this.resolveConfiguration(extractionConfig.configuration, configDir).modules
    /* v8 ignore start -- resolved config returns one module for one-module input */
    if (first === undefined)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': Config has empty modules array`,
      )
    /* v8 ignore stop */
    return this.moduleInput(first)
  }

  private topLevelRulesToModule(parsed: Partial<ValidatedModuleInput>): ResolvedModuleDefaults {
    return {
      api: parsed.api ?? NOT_USED,
      useCase: parsed.useCase ?? NOT_USED,
      domainOp: parsed.domainOp ?? NOT_USED,
      event: parsed.event ?? NOT_USED,
      eventHandler: parsed.eventHandler ?? NOT_USED,
      ui: parsed.ui ?? NOT_USED,
    }
  }

  private resolveModule(module: DraftModule, configDir: string): ValidatedModuleInput {
    const extendsSource = module.extends
    if (extendsSource === undefined) {
      return module
    }

    const baseModule = this.loadExtendedModule(extendsSource, configDir)
    const mergedCustomTypes =
      baseModule.customTypes === undefined && module.customTypes === undefined
        ? undefined
        : { ...baseModule.customTypes, ...module.customTypes }

    return {
      name: module.name,
      domain: module.domain,
      path: module.path,
      glob: module.glob,
      ...(module.modules !== undefined && { modules: module.modules }),
      api: module.api ?? baseModule.api,
      useCase: module.useCase ?? baseModule.useCase,
      domainOp: module.domainOp ?? baseModule.domainOp,
      event: module.event ?? baseModule.event,
      eventHandler: module.eventHandler ?? baseModule.eventHandler,
      ui: module.ui ?? baseModule.ui,
      ...(mergedCustomTypes !== undefined && { customTypes: mergedCustomTypes }),
    }
  }

  private createExtractionProject(
    parsedConfigState: ParsedConfigState,
    sourceFilePaths: string[],
    useTsConfig: boolean,
    draftComponents: DraftComponent[] = [],
  ): ExtractionProject {
    const projectResult = ExtractionProject.parse({
      configuration: parsedConfigState.configuration,
      moduleSources: this.createModuleSources(
        parsedConfigState.configDir,
        parsedConfigState.configuration,
        sourceFilePaths,
        useTsConfig,
      ),
      repositoryName: getRepositoryInfo().name,
      draftComponents,
    })
    if (!projectResult.success)
      throw new ExtractionConfigError('VALIDATION_ERROR', projectResult.error)
    return projectResult.data
  }

  private resolveSourceFilePaths(parsedConfigState: ParsedConfigState): string[] {
    const sourceFilePaths = parsedConfigState.configuration.modules
      .flatMap((module) =>
        globSync(posix.join(module.path, module.glob), { cwd: parsedConfigState.configDir }),
      )
      .map((filePath) => resolve(parsedConfigState.configDir, filePath))

    if (sourceFilePaths.length === 0) {
      const patterns = parsedConfigState.configuration.modules
        .map((module) => posix.join(module.path, module.glob))
        .join(', ')
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
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
    const missingFiles = requestedFiles.filter((filePath) => !fileExists(resolve(filePath)))
    if (missingFiles.length > 0)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Files not found: ${missingFiles.join(', ')}`,
      )

    const requestedAbsolute = new Set(requestedFiles.map((filePath) => resolve(filePath)))
    return allSourceFiles.filter((filePath) => requestedAbsolute.has(filePath))
  }

  private createModuleSources(
    configDir: string,
    configuration: ValidatedConfiguration,
    sourceFilePaths: string[],
    useTsConfig: boolean,
  ) {
    const sourceFileSet = new Set(sourceFilePaths)

    const sources = new Map<
      ValidatedModule,
      { files: string[]; project: ReturnType<typeof createConfiguredProject> }
    >()
    for (const module of configuration.modules) {
      const allModuleFiles = globSync(posix.join(module.path, module.glob), { cwd: configDir }).map(
        (filePath) => resolve(configDir, filePath),
      )
      const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
      const moduleConfigDir = findModuleTsConfigDir(configDir, module.path)
      const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
      project.addSourceFilesAtPaths(moduleFiles)

      sources.set(module, { files: moduleFiles, project })
    }
    return sources
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

  private isDraftComponentArray(value: unknown): value is DraftComponentInput[] {
    if (!Array.isArray(value)) return false
    return value.every((item: unknown) => this.isDraftComponentInput(item))
  }

  private isDraftComponentInput(value: unknown): value is DraftComponentInput {
    if (!this.isRecord(value)) return false
    return (
      typeof value['type'] === 'string' &&
      typeof value['name'] === 'string' &&
      typeof value['domain'] === 'string' &&
      typeof value['module'] === 'string' &&
      this.isSourceLocation(value['location'])
    )
  }

  private isSourceLocation(value: unknown): value is DraftComponentInput['location'] {
    return (
      this.isRecord(value) && typeof value['file'] === 'string' && typeof value['line'] === 'number'
    )
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private isTopLevelRulesConfig(value: unknown): value is Partial<ValidatedModuleInput> {
    return (
      typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
    )
  }

  private moduleInput(module: ValidatedModule): ValidatedModuleInput {
    return {
      name: module.name,
      domain: module.domain,
      path: module.path,
      glob: module.glob,
      ...(module.modules !== undefined && { modules: module.modules }),
      api: module.api,
      useCase: module.useCase,
      domainOp: module.domainOp,
      event: module.event,
      eventHandler: module.eventHandler,
      ui: module.ui,
      ...(module.customTypes !== undefined && { customTypes: module.customTypes }),
    }
  }
}
