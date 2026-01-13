import {
  existsSync, readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { ModuleRefNotFoundError } from '../../errors'

interface ModuleRef { $ref: string }

function isModuleRef(value: unknown): value is ModuleRef {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (!('$ref' in value)) {
    return false
  }
  return typeof value.$ref === 'string'
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

/**
 * Expands $ref references in the modules array.
 * @param config - The parsed config data with potential $ref entries.
 * @param configDir - The directory containing the main config file.
 * @returns The config with $refs expanded to actual module content.
 */
export function expandModuleRefs(config: unknown, configDir: string): unknown {
  if (!hasModulesArray(config)) {
    return config
  }

  const expandedModules = config.modules.map((module) => {
    if (!isModuleRef(module)) {
      return module
    }

    const filePath = resolve(configDir, module.$ref)
    if (!existsSync(filePath)) {
      throw new ModuleRefNotFoundError(module.$ref, filePath)
    }
    const content = readFileSync(filePath, 'utf-8')
    const parsed: unknown = parseYaml(content)
    return parsed
  })

  return {
    ...config,
    modules: expandedModules,
  }
}
