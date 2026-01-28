import {
  dirname, resolve 
} from 'node:path'
import {
  existsSync, readFileSync 
} from 'node:fs'
import { createRequire } from 'node:module'
import { parse as parseYaml } from 'yaml'
import {
  type Module, parseExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import {
  type ConfigLoader, resolveConfig 
} from '@living-architecture/riviere-extract-ts'
import {
  ConfigFileNotFoundError,
  ConfigSchemaValidationError,
  InternalSchemaValidationError,
  InvalidConfigFormatError,
  PackageResolveError,
} from '../../errors'

interface TopLevelRulesConfig {
  api?: Module['api']
  useCase?: Module['useCase']
  domainOp?: Module['domainOp']
  event?: Module['event']
  eventHandler?: Module['eventHandler']
  ui?: Module['ui']
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
    return {
      name: 'extended',
      path: '**',
      api: parsed.api ?? { notUsed: true },
      useCase: parsed.useCase ?? { notUsed: true },
      domainOp: parsed.domainOp ?? { notUsed: true },
      event: parsed.event ?? { notUsed: true },
      eventHandler: parsed.eventHandler ?? { notUsed: true },
      ui: parsed.ui ?? { notUsed: true },
    }
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
