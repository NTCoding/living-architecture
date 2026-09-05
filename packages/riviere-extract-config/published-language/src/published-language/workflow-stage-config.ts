import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import type { ValidatedConfiguration } from './validated-configuration'

/** @riviere-role published-language-data-structure */
export interface CodeExtractionConfig {
  readonly modules: ValidatedConfiguration['modules']
  readonly connections: ValidatedConfiguration['connections']
  readonly schema: ValidatedConfiguration['schema']
}

/** @riviere-role published-language-data-structure */
export interface EventCatalogImportConfig {
  readonly source: string
  readonly mappings: string
  readonly allowUnmapped: boolean
}

/** @riviere-role published-language-data-structure */
export interface AsyncApiImportConfig {
  readonly source: string
  readonly mappings: string
  readonly allowUnmapped: boolean
}

/** @riviere-role published-language-union */
export type AiExtractionGap =
  | 'uncertain-links'
  | 'missing-events'
  | 'missing-event-handlers'
  | 'missing-use-cases'

/** @riviere-role published-language-data-structure */
export interface AiCliConfig {
  readonly command: string
  readonly args: readonly string[]
  readonly timeoutSeconds: number
  readonly memory?: string
  readonly promptAppend?: string
  readonly sources: readonly string[]
}

/** @riviere-role published-language-data-structure */
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

/** @riviere-role published-language-union */
export type AiEnrichableField =
  | 'eventName'
  | 'subscribedEvents'
  | 'operationName'
  | 'route'
  | 'httpMethod'
  | 'path'

/** @riviere-role published-language-data-structure */
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
