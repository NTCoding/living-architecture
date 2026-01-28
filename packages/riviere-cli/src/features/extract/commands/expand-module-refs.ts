import {
  existsSync, readFileSync 
} from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { ModuleRef } from '@living-architecture/riviere-extract-config'
import { ModuleRefNotFoundError } from '../../../shell/errors/errors'

function isModuleRef(value: unknown): value is ModuleRef {
  return (
    typeof value === 'object' && value !== null && '$ref' in value && typeof value.$ref === 'string'
  )
}

function hasModulesArray(value: unknown): value is { modules: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'modules' in value &&
    Array.isArray(value.modules)
  )
}

/**
 * Expands $ref references in the modules array.
 * Ensures all ModuleRef entries are replaced with inline ModuleConfig.
 * @param config - The parsed config data with potential $ref entries.
 * @param configDir - The directory containing the main config file.
 * @returns The config with $refs expanded to actual module content (ExtractionConfig).
 */
export function expandModuleRefs(config: unknown, configDir: string): unknown {
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
    const parsed: unknown = parseYaml(content)
    return parsed
  })

  return {
    ...config,
    modules: expandedModules,
  }
}
