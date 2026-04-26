import {
  existsSync, readFileSync 
} from 'node:fs'
import {
  dirname, posix, resolve 
} from 'node:path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { resolveConfig } from '@living-architecture/riviere-extract-ts'
import {
  type ExtractionConfig,
  formatValidationErrors,
  isValidExtractionConfig,
  type ModuleConfig,
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
import { ExtractionProject } from '../../../domain/extraction-project'
import { loadExtendedModule } from '../../external-clients/extraction-config/load-extended-module'
import { createConfiguredProject } from '../../external-clients/ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../../external-clients/ts-morph/find-module-tsconfig-dir'

class ModuleRefNotFoundError extends Error {
  constructor(ref: string, filePath: string) {
    super(`Cannot resolve module reference '${ref}'. File not found: ${filePath}`)
    this.name = 'ModuleRefNotFoundError'
  }
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
      resolvedConfig: this.resolveConfigWithExtends(expanded, configDir),
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

  private resolveConfigWithExtends(
    config: ExtractionConfig,
    configDir: string,
  ): ResolvedExtractionConfig {
    return resolveConfig({
      ...config,
      modules: config.modules.map((moduleConfig) =>
        this.resolveModuleConfig(moduleConfig, configDir),
      ),
    })
  }

  private resolveModuleConfig(moduleConfig: ModuleConfig, configDir: string): Module {
    const extendsSource = moduleConfig.extends
    if (extendsSource === undefined) {
      const [resolvedModule] = resolveConfig({ modules: [moduleConfig] }).modules
      /* v8 ignore start -- resolveConfig returns one module for one-module input */
      if (resolvedModule === undefined) {
        throw new TypeError(`Expected resolved module for '${moduleConfig.name}'`)
      }
      /* v8 ignore end */
      return resolvedModule
    }

    const baseModule = loadExtendedModule({
      configDir,
      source: extendsSource,
      resolveConfigWithExtends: (config, nextConfigDir) =>
        this.resolveConfigWithExtends(config, nextConfigDir),
    })
    const mergedCustomTypes = this.mergeCustomTypes(
      baseModule.customTypes,
      moduleConfig.customTypes,
    )

    return {
      name: moduleConfig.name,
      domain: moduleConfig.domain,
      path: moduleConfig.path,
      glob: moduleConfig.glob,
      ...(moduleConfig.modules !== undefined && { modules: moduleConfig.modules }),
      api: moduleConfig.api ?? baseModule.api,
      useCase: moduleConfig.useCase ?? baseModule.useCase,
      domainOp: moduleConfig.domainOp ?? baseModule.domainOp,
      event: moduleConfig.event ?? baseModule.event,
      eventHandler: moduleConfig.eventHandler ?? baseModule.eventHandler,
      ui: moduleConfig.ui ?? baseModule.ui,
      ...(mergedCustomTypes !== undefined && { customTypes: mergedCustomTypes }),
    }
  }

  private mergeCustomTypes(
    base: Module['customTypes'],
    local: ModuleConfig['customTypes'],
  ): Module['customTypes'] {
    if (base === undefined && local === undefined) {
      return undefined
    }

    return {
      ...base,
      ...local,
    }
  }

  private createExtractionProject(
    parsedConfigState: ParsedConfigState,
    sourceFilePaths: string[],
    useTsConfig: boolean,
    draftComponents: DraftComponent[] = [],
  ): ExtractionProject {
    return new ExtractionProject(
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
  ) {
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
