import type {
  AiEnrichConfig,
  AiExtractConfig,
  AsyncApiImportConfig,
  CodeExtractionConfig,
  EventCatalogImportConfig,
} from '@living-architecture/riviere-extract-config-published-language'

type CodeExtractionStage = Readonly<{
  kind: 'code-extraction'
  name: string
  config: CodeExtractionConfig
}>

type EventCatalogImportStage = Readonly<{
  kind: 'eventcatalog-import'
  name: string
  config: EventCatalogImportConfig
}>

type AsyncApiImportStage = Readonly<{
  kind: 'asyncapi-import'
  name: string
  config: AsyncApiImportConfig
}>

type AiExtractStage = Readonly<{
  kind: 'ai-extract'
  name: string
  config: AiExtractConfig
}>

type AiEnrichStage = Readonly<{
  kind: 'ai-enrich'
  name: string
  config: AiEnrichConfig
}>

type SchemaValidateStage = Readonly<{
  kind: 'schema-validate'
  name: string
}>

type WorkflowStageValue =
  | CodeExtractionStage
  | EventCatalogImportStage
  | AsyncApiImportStage
  | AiExtractStage
  | AiEnrichStage
  | SchemaValidateStage

/** @riviere-role value-object */
export class WorkflowStage {
  declare private readonly brand: 'WorkflowStage'

  static fromCodeExtraction(name: string, config: CodeExtractionConfig): WorkflowStage {
    return new WorkflowStage({
      kind: 'code-extraction',
      name,
      config: copyCodeExtractionConfig(config),
    })
  }

  static fromEventCatalogImport(name: string, config: EventCatalogImportConfig): WorkflowStage {
    return new WorkflowStage({
      kind: 'eventcatalog-import',
      name,
      config: copyEventCatalogImportConfig(config),
    })
  }

  static fromAsyncApiImport(name: string, config: AsyncApiImportConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'asyncapi-import', name, config: { ...config } })
  }

  static fromAiExtract(name: string, config: AiExtractConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'ai-extract', name, config: copyAiExtractConfig(config) })
  }

  static fromAiEnrich(name: string, config: AiEnrichConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'ai-enrich', name, config: copyAiEnrichConfig(config) })
  }

  static fromSchemaValidation(name: string): WorkflowStage {
    return new WorkflowStage({ kind: 'schema-validate', name })
  }

  static fromMaterialized(value: WorkflowStageValue): WorkflowStage {
    return new WorkflowStage(value)
  }

  private constructor(readonly value: WorkflowStageValue) {}
}

function copyCodeExtractionConfig(config: CodeExtractionConfig): CodeExtractionConfig {
  return {
    modules: [...config.modules],
    ...(config.connections === undefined
      ? { connections: undefined }
      : {
          connections: {
            ...(config.connections.eventPublishers === undefined
              ? {}
              : {
                  eventPublishers: config.connections.eventPublishers.map((publisher) => ({
                    ...publisher,
                  })),
                }),
            ...(config.connections.httpLinks === undefined
              ? {}
              : {
                  httpLinks: config.connections.httpLinks.map((link) => ({
                    ...link,
                    matchApiBy: [...link.matchApiBy],
                  })),
                }),
          },
        }),
    schema: config.schema,
  }
}

function copyEventCatalogImportConfig(config: EventCatalogImportConfig): EventCatalogImportConfig {
  return {
    source: config.source,
    sourceFilePath: config.sourceFilePath,
    allowUnmapped: config.allowUnmapped,
    mappings: {
      domains: { ...config.mappings.domains },
      services: Object.fromEntries(
        Object.entries(config.mappings.services).map(([id, mapping]) => [id, { ...mapping }]),
      ),
      events: Object.fromEntries(
        Object.entries(config.mappings.events).map(([id, mapping]) => [id, { ...mapping }]),
      ),
    },
  }
}

function copyAiExtractConfig(config: AiExtractConfig): AiExtractConfig {
  return {
    ...config,
    args: [...config.args],
    sources: [...config.sources],
    selection: {
      from: [...config.selection.from],
      componentTypes: [...config.selection.componentTypes],
    },
    outputs: { ...config.outputs },
    context: { ...config.context, exclude: [...config.context.exclude] },
  }
}

function copyAiEnrichConfig(config: AiEnrichConfig): AiEnrichConfig {
  return {
    ...config,
    args: [...config.args],
    sources: [...config.sources],
    selection: {
      componentTypes: [...config.selection.componentTypes],
      missingFieldsOnly: config.selection.missingFieldsOnly,
    },
    fields: [...config.fields],
    context: { ...config.context, exclude: [...config.context.exclude] },
  }
}

export type { WorkflowStageValue }
