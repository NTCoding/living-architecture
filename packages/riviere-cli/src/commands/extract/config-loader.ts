import {
  dirname, resolve 
} from 'node:path'
import {
  existsSync, readFileSync 
} from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type { Module } from '@living-architecture/riviere-extract-config'
import type { ConfigLoader } from '@living-architecture/riviere-extract-ts'

interface ExtendedConfig {
  modules?: Module[]
  api?: Module['api']
  useCase?: Module['useCase']
  domainOp?: Module['domainOp']
  event?: Module['event']
  eventHandler?: Module['eventHandler']
  ui?: Module['ui']
}

function isExtendedConfig(value: unknown): value is ExtendedConfig {
  return typeof value === 'object' && value !== null
}

function parseConfigContent(content: string): ExtendedConfig {
  const parsed: unknown = parseYaml(content)
  if (!isExtendedConfig(parsed)) {
    throw new Error('Invalid extended config format')
  }
  return parsed
}

function extractModuleFromConfig(config: ExtendedConfig): Module {
  const firstModule = config.modules?.[0]
  if (firstModule !== undefined) {
    return firstModule
  }

  return {
    name: 'extended',
    path: '**',
    api: config.api ?? { notUsed: true },
    useCase: config.useCase ?? { notUsed: true },
    domainOp: config.domainOp ?? { notUsed: true },
    event: config.event ?? { notUsed: true },
    eventHandler: config.eventHandler ?? { notUsed: true },
    ui: config.ui ?? { notUsed: true },
  }
}

function isPackageReference(source: string): boolean {
  return !source.startsWith('.') && !source.startsWith('/')
}

function resolvePackagePath(packageName: string): string {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`)
    const packageDir = dirname(packageJsonPath)
    const defaultConfigPath = resolve(packageDir, 'src/default-extraction.config.json')
    if (existsSync(defaultConfigPath)) {
      return defaultConfigPath
    }
    throw new Error(
      `Package '${packageName}' does not contain 'src/default-extraction.config.json'. ` +
        `Ensure the package exports a default extraction config.`,
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not contain')) {
      throw error
    }
    throw new Error(
      `Cannot resolve package '${packageName}'. ` +
        `Ensure the package is installed in node_modules.`,
    )
  }
}

function loadConfigFile(filePath: string, source: string): ExtendedConfig {
  if (!existsSync(filePath)) {
    throw new Error(
      `Cannot resolve extends reference '${source}'. ` + `File not found: ${filePath}`,
    )
  }

  const content = readFileSync(filePath, 'utf-8')
  return parseConfigContent(content)
}

export function createConfigLoader(configDir: string): ConfigLoader {
  return (source: string): Module => {
    const filePath = isPackageReference(source)
      ? resolvePackagePath(source)
      : resolve(configDir, source)

    const config = loadConfigFile(filePath, source)
    return extractModuleFromConfig(config)
  }
}
