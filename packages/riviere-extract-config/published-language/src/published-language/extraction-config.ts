import { resolve } from 'node:path'
import { z } from 'zod'
import type { DraftConfiguration } from './extraction-config-schema'
import type { ValidationError } from './validation'
import { parseExtractionConfig } from './validation'

type ReadReferencedConfiguration = (path: string) => unknown
type ModuleReference = { readonly $ref: string }

const MODULE_CONFIGURATION_SCHEMA = z.looseObject({ modules: z.array(z.unknown()) })
const MODULE_REFERENCE_SCHEMA = z.looseObject({ $ref: z.string() })

/** @riviere-role published-language-data-structure */
export type ExtractionConfigParseResult =
  | { readonly success: true; readonly configuration: ExtractionConfig }
  | { readonly success: false; readonly errors: ValidationError[] }

/** @riviere-role value-object */
export class ExtractionConfig {
  declare private readonly brand: 'ExtractionConfig'

  private constructor(private readonly value: DraftConfiguration) {}

  static parse(
    rawConfiguration: unknown,
    configDirectory: string,
    readReferencedConfiguration: ReadReferencedConfiguration,
  ): ExtractionConfigParseResult {
    const expandedConfiguration = expandModuleReferences(
      rawConfiguration,
      configDirectory,
      readReferencedConfiguration,
    )
    const parsedConfiguration = parseExtractionConfig(expandedConfiguration)
    if (!parsedConfiguration.success) return parsedConfiguration
    return {
      success: true,
      configuration: new ExtractionConfig(parsedConfiguration.configuration),
    }
  }

  draftConfiguration(): DraftConfiguration {
    return this.value
  }
}

function expandModuleReferences(
  rawConfiguration: unknown,
  configDirectory: string,
  readReferencedConfiguration: ReadReferencedConfiguration,
): unknown {
  if (!isModuleConfiguration(rawConfiguration)) return rawConfiguration
  return {
    ...rawConfiguration,
    modules: rawConfiguration.modules.map((module) =>
      isModuleReference(module)
        ? readReferencedConfiguration(resolveReferencePath(configDirectory, module.$ref))
        : module,
    ),
  }
}

function isModuleConfiguration(value: unknown): value is { readonly modules: readonly unknown[] } {
  return MODULE_CONFIGURATION_SCHEMA.safeParse(value).success
}

function isModuleReference(value: unknown): value is ModuleReference {
  return MODULE_REFERENCE_SCHEMA.safeParse(value).success
}

function resolveReferencePath(configDirectory: string, reference: string): string {
  return resolve(configDirectory, reference)
}
