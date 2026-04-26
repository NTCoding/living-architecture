import {
  existsSync, readFileSync 
} from 'node:fs'
import { createRequire } from 'node:module'
import {
  dirname, resolve 
} from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  parseExtractionConfig,
  type ExtractionConfig,
  type Module,
  type ResolvedExtractionConfig,
} from '@living-architecture/riviere-extract-config'

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
  ui?: Module['ui']
}

/** @riviere-role external-client-service */
export function loadExtendedModule(params: {
  configDir: string
  source: string
  resolveConfigWithExtends: (
    config: ExtractionConfig,
    configDir: string,
  ) => ResolvedExtractionConfig
}): Module {
  const filePath = resolveExtendedConfigPath(params.source, params.configDir)
  if (!existsSync(filePath)) {
    throw new ConfigFileNotFoundError(params.source, filePath)
  }

  const content = readFileSync(filePath, 'utf-8')
  return parseExtendedConfigContent(
    content,
    params.source,
    dirname(filePath),
    params.resolveConfigWithExtends,
  )
}

function resolveExtendedConfigPath(source: string, configDir: string): string {
  return isPackageReference(source)
    ? resolvePackagePath(source, configDir)
    : resolve(configDir, source)
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
    throw new PackageResolveError(packageName)
  } catch {
    throw new PackageResolveError(packageName)
  }
}

function parseExtendedConfigContent(
  content: string,
  source: string,
  configDir: string,
  resolveConfigWithExtends: (
    config: ExtractionConfig,
    configDir: string,
  ) => ResolvedExtractionConfig,
): Module {
  const parsed: unknown = parseYaml(content)

  if (hasModulesArray(parsed)) {
    return resolveFirstModuleFromConfig(parsed, source, configDir, resolveConfigWithExtends)
  }

  if (isTopLevelRulesConfig(parsed)) {
    return topLevelRulesToModule(parsed)
  }

  const preview = JSON.stringify(parsed, null, 2).slice(0, 200)
  throw new InvalidConfigFormatError(source, preview)
}

function resolveFirstModuleFromConfig(
  parsed: { modules: unknown[] },
  source: string,
  configDir: string,
  resolveConfigWithExtends: (
    config: ExtractionConfig,
    configDir: string,
  ) => ResolvedExtractionConfig,
): Module {
  if (parsed.modules.length === 0) {
    throw new ConfigSchemaValidationError(source, 'Config has empty modules array')
  }

  try {
    const config = parseExtractionConfig(parsed)
    const [first] = resolveConfigWithExtends(config, configDir).modules
    /* v8 ignore next -- resolved config returns one module for one-module input */
    if (first === undefined) {
      throw new ConfigSchemaValidationError(source, 'Config has empty modules array')
    }
    return first
  } catch (error) {
    throw new ConfigSchemaValidationError(source, String(error))
  }
}

function hasModulesArray(value: unknown): value is { modules: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'modules' in value &&
    Array.isArray(value.modules)
  )
}

function isTopLevelRulesConfig(value: unknown): value is TopLevelRulesConfig {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
  )
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
    ui: parsed.ui ?? NOT_USED,
  }
}
