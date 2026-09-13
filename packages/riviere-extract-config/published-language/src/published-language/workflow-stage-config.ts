import { z } from 'zod'
import {
  COMPONENT_TYPES,
  type Component,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { ValidatedConfiguration } from './validated-configuration'
import type { EventCatalogMappings } from './eventcatalog-mappings'

/** @riviere-role published-language-data-structure */
export interface CodeExtractionConfig {
  readonly modules: ValidatedConfiguration['modules']
  readonly connections: ValidatedConfiguration['connections']
  readonly schema: ValidatedConfiguration['schema']
}

/** @riviere-role published-language-schema */
export interface EventCatalogImportConfig {
  readonly source: string
  readonly sourceFilePath: string
  readonly mappings: EventCatalogMappings
  readonly allowUnmapped: boolean
}

/** @riviere-role published-language-schema */
export interface EventCatalogImportFileConfig {
  readonly source: string
  readonly mappings: string
  readonly allowUnmapped: boolean
}

/** @riviere-role published-language-schema */
export interface AsyncApiImportConfig {
  readonly source: string
  readonly mappings: string
  readonly allowUnmapped: boolean
}

/** @riviere-role published-language-enumeration */
export const AI_EXTRACTION_GAPS = [
  'uncertain-links',
  'missing-events',
  'missing-event-handlers',
  'missing-use-cases',
] as const

/** @riviere-role published-language-enumeration-type */
export type AiExtractionGap = (typeof AI_EXTRACTION_GAPS)[number]

/** @riviere-role published-language-data-structure */
export interface AiCliConfig {
  readonly command: string
  readonly args: readonly string[]
  readonly timeoutSeconds: number
  readonly memory?: string
  readonly promptAppend?: string
  readonly sources: readonly string[]
}

/** @riviere-role published-language-schema */
export interface AiExtractConfig extends AiCliConfig {
  readonly selection: Readonly<{
    from: readonly AiExtractionGap[]
    componentTypes: readonly Component['type'][]
  }>
  readonly outputs: Readonly<{
    addComponents: boolean
    addLinks: boolean
  }>
  readonly context: Readonly<{
    exclude: readonly string[]
    maxFilesPerBatch: number
    maxBatches: number
  }>
}

/** @riviere-role published-language-enumeration */
export const AI_ENRICHABLE_FIELDS = [
  'eventName',
  'subscribedEvents',
  'operationName',
  'route',
  'httpMethod',
  'path',
] as const

/** @riviere-role published-language-enumeration-type */
export type AiEnrichableField = (typeof AI_ENRICHABLE_FIELDS)[number]

/** @riviere-role published-language-schema */
export interface AiEnrichConfig extends AiCliConfig {
  readonly selection: Readonly<{
    componentTypes: readonly Component['type'][]
    missingFieldsOnly: true
  }>
  readonly fields: readonly AiEnrichableField[]
  readonly context: Readonly<{
    exclude: readonly string[]
    maxFilesPerComponent: number
  }>
}

type StageConfigParseFailure = Readonly<{ success: false; issues: readonly string[] }>

const nonEmptyString = z.string().trim().min(1)
const componentTypesSchema = z.enum(COMPONENT_TYPES)

const importConfigSchema = z.strictObject({
  source: nonEmptyString,
  mappings: nonEmptyString,
  'allow-unmapped': z.boolean(),
})

const aiExtractConfigSchema = z.strictObject({
  command: nonEmptyString,
  args: z.array(nonEmptyString),
  'timeout-seconds': z.number().int().min(1),
  memory: nonEmptyString.optional(),
  'prompt-append': nonEmptyString.optional(),
  sources: z.array(nonEmptyString).min(1),
  selection: z.strictObject({
    from: z.array(z.enum(AI_EXTRACTION_GAPS)).min(1),
    'component-types': z.array(componentTypesSchema).min(1),
  }),
  outputs: z.strictObject({
    'add-components': z.boolean(),
    'add-links': z.boolean(),
  }),
  context: z.strictObject({
    exclude: z.array(nonEmptyString),
    'max-files-per-batch': z.number().int().min(1),
    'max-batches': z.number().int().min(1),
  }),
})

const aiEnrichConfigSchema = z.strictObject({
  command: nonEmptyString,
  args: z.array(nonEmptyString),
  'timeout-seconds': z.number().int().min(1),
  memory: nonEmptyString.optional(),
  'prompt-append': nonEmptyString.optional(),
  sources: z.array(nonEmptyString).min(1),
  selection: z.strictObject({
    'component-types': z.array(componentTypesSchema).min(1),
    'missing-fields-only': z.literal(true),
  }),
  fields: z.array(z.enum(AI_ENRICHABLE_FIELDS)).min(1),
  context: z.strictObject({
    exclude: z.array(nonEmptyString),
    'max-files-per-component': z.number().int().min(1),
  }),
})

function parseStageConfig<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { success: true; config: T } | StageConfigParseFailure {
  const result = schema.safeParse(value)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.length === 0 ? '/' : issue.path.join('.')}: ${issue.message}`,
      ),
    }
  }
  return { success: true, config: result.data }
}

type RawImportConfig = Readonly<{
  source: string
  mappings: string
  allowUnmapped: boolean
}>

function parseImportConfig(
  value: unknown,
): { success: true; config: RawImportConfig } | StageConfigParseFailure {
  const result = parseStageConfig(importConfigSchema, value)
  if (!result.success) return result
  return {
    success: true,
    config: {
      source: result.config.source,
      mappings: result.config.mappings,
      allowUnmapped: result.config['allow-unmapped'],
    },
  }
}

/** @riviere-role published-language-parser */
export function parseEventCatalogImportConfig(
  value: unknown,
):
  | { success: true; config: EventCatalogImportFileConfig }
  | { success: false; issues: readonly string[] } {
  return parseImportConfig(value)
}

/** @riviere-role published-language-parser */
export function parseAsyncApiImportConfig(
  value: unknown,
): { success: true; config: AsyncApiImportConfig } | { success: false; issues: readonly string[] } {
  return parseImportConfig(value)
}

/** @riviere-role published-language-parser */
export function parseAiExtractConfig(
  value: unknown,
): { success: true; config: AiExtractConfig } | { success: false; issues: readonly string[] } {
  const result = parseStageConfig(aiExtractConfigSchema, value)
  if (!result.success) return result
  return {
    success: true,
    config: {
      command: result.config.command,
      args: result.config.args,
      timeoutSeconds: result.config['timeout-seconds'],
      ...(result.config.memory === undefined ? {} : { memory: result.config.memory }),
      ...(result.config['prompt-append'] === undefined
        ? {}
        : { promptAppend: result.config['prompt-append'] }),
      sources: result.config.sources,
      selection: {
        from: result.config.selection.from,
        componentTypes: result.config.selection['component-types'],
      },
      outputs: {
        addComponents: result.config.outputs['add-components'],
        addLinks: result.config.outputs['add-links'],
      },
      context: {
        exclude: result.config.context.exclude,
        maxFilesPerBatch: result.config.context['max-files-per-batch'],
        maxBatches: result.config.context['max-batches'],
      },
    },
  }
}

/** @riviere-role published-language-parser */
export function parseAiEnrichConfig(
  value: unknown,
): { success: true; config: AiEnrichConfig } | { success: false; issues: readonly string[] } {
  const result = parseStageConfig(aiEnrichConfigSchema, value)
  if (!result.success) return result
  return {
    success: true,
    config: {
      command: result.config.command,
      args: result.config.args,
      timeoutSeconds: result.config['timeout-seconds'],
      ...(result.config.memory === undefined ? {} : { memory: result.config.memory }),
      ...(result.config['prompt-append'] === undefined
        ? {}
        : { promptAppend: result.config['prompt-append'] }),
      sources: result.config.sources,
      selection: {
        componentTypes: result.config.selection['component-types'],
        missingFieldsOnly: result.config.selection['missing-fields-only'],
      },
      fields: result.config.fields,
      context: {
        exclude: result.config.context.exclude,
        maxFilesPerComponent: result.config.context['max-files-per-component'],
      },
    },
  }
}
