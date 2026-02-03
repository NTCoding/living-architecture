import {
  dirname, resolve 
} from 'node:path'
import {
  existsSync, readFileSync 
} from 'node:fs'
import { createRequire } from 'node:module'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import {
  type Module,
  parseExtractionConfig,
  validateExtractionConfig,
  formatValidationErrors,
  isValidExtractionConfig,
  type ResolvedExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import {
  type ConfigLoader, resolveConfig 
} from '@living-architecture/riviere-extract-ts'
import {
  ConfigFileNotFoundError,
  ConfigSchemaValidationError,
  InternalSchemaValidationError,
  InvalidConfigFormatError,
  ModuleRefNotFoundError,
  PackageResolveError,
} from '../errors/errors'
import { expandModuleRefs } from './expand-module-refs'
import { exitWithConfigValidation } from '../cli-presentation/exit-handlers'
import { CliErrorCode } from '../cli-presentation/error-codes'

interface TopLevelRulesConfig {
  api?: Module['api']
  useCase?: Module['useCase']
  domainOp?: Module['domainOp']
  event?: Module['event']
  eventHandler?: Module['eventHandler']
  eventPublisher?: Module['eventPublisher']
  ui?: Module['ui']
}

const NOT_USED = { notUsed: true } as const

function topLevelRulesToModule(parsed: TopLevelRulesConfig): Module {
  return {
    name: 'extended',
    path: '**',
    api: parsed.api ?? NOT_USED,
    useCase: parsed.useCase ?? NOT_USED,
    domainOp: parsed.domainOp ?? NOT_USED,
    event: parsed.event ?? NOT_USED,
    eventHandler: parsed.eventHandler ?? NOT_USED,
    eventPublisher: parsed.eventPublisher ?? NOT_USED,
    ui: parsed.ui ?? NOT_USED,
  }
}

class PackageConfigNotFoundError extends Error {
  constructor(packageName: string) {
    super(
      `Package '${packageName}' does not contain 'src/default-extraction.config.json'. ` +
        `Ensure the package exports a default extraction config.`,
    )
    this.name = 'PackageConfigNotFoundError'
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
      /* v8 ignore next -- @preserve */
      if (firstModule === undefined) {
        throw new InternalSchemaValidationError()
      }
      return firstModule
    } catch (error) {
      /* v8 ignore next -- @preserve defensive for non-Error throws */
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

export function createConfigLoader(configDir: string): ConfigLoader {
  return (source: string): Module => {
    const filePath = isPackageReference(source)
      ? resolvePackagePath(source, configDir)
      : resolve(configDir, source)

    return loadConfigFile(filePath, source)
  }
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

function parseConfigFile(content: string): ParseResult {
  try {
    return {
      success: true,
      data: parseYaml(content),
    }
  } catch (error) {
    /* v8 ignore next -- @preserve: yaml library always throws Error instances; defensive guard */
    const message = error instanceof Error ? error.message : 'Unknown parse error'
    return {
      success: false,
      error: message,
    }
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
    /* v8 ignore next -- @preserve: error is always Error from yaml parser; defensive guard */
    const message = error instanceof Error ? error.message : 'Unknown error during module expansion'
    return {
      success: false,
      error: message,
    }
  }
}

export function resolveSourceFiles(
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
): string[] {
  const sourceFilePaths = resolvedConfig.modules
    .flatMap((module) => globSync(module.path, { cwd: configDir }))
    .map((filePath) => resolve(configDir, filePath))

  if (sourceFilePaths.length === 0) {
    const patterns = resolvedConfig.modules.map((m) => m.path).join(', ')
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `No files matched extraction patterns: ${patterns}\nConfig directory: ${configDir}`,
    )
  }

  return sourceFilePaths
}

interface ValidatedConfig {
  resolvedConfig: ResolvedExtractionConfig
  configDir: string
}

export function loadAndValidateConfig(configPath: string): ValidatedConfig {
  if (!existsSync(configPath)) {
    exitWithConfigValidation(CliErrorCode.ConfigNotFound, `Config file not found: ${configPath}`)
  }

  const content = readFileSync(configPath, 'utf-8')
  const parseResult = parseConfigFile(content)

  if (!parseResult.success) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid config file: ${parseResult.error}`,
    )
  }

  const configDir = dirname(resolve(configPath))
  const expansionResult = tryExpandModuleRefs(parseResult.data, configDir)

  if (!expansionResult.success) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Error expanding module references: ${expansionResult.error}`,
    )
  }

  if (!isValidExtractionConfig(expansionResult.data)) {
    const validationResult = validateExtractionConfig(expansionResult.data)
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
    )
  }

  return {
    resolvedConfig: resolveConfig(expansionResult.data, createConfigLoader(configDir)),
    configDir,
  }
}
