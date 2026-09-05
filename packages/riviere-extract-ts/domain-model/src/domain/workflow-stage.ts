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
    return new WorkflowStage({ kind: 'code-extraction', name, config })
  }

  static fromEventCatalogImport(name: string, config: EventCatalogImportConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'eventcatalog-import', name, config })
  }

  static fromAsyncApiImport(name: string, config: AsyncApiImportConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'asyncapi-import', name, config })
  }

  static fromAiExtract(name: string, config: AiExtractConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'ai-extract', name, config })
  }

  static fromAiEnrich(name: string, config: AiEnrichConfig): WorkflowStage {
    return new WorkflowStage({ kind: 'ai-enrich', name, config })
  }

  static fromSchemaValidation(name: string): WorkflowStage {
    return new WorkflowStage({ kind: 'schema-validate', name })
  }

  private constructor(readonly value: WorkflowStageValue) {}
}

export type { WorkflowStageValue }
