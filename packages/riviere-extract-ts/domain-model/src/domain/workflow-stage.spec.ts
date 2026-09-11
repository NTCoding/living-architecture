import type {
  AiEnrichConfig,
  AiExtractConfig,
  AsyncApiImportConfig,
  CodeExtractionConfig,
  EventCatalogImportConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it } from 'vitest'
import { configuration } from './__fixtures__/workflow-fixtures'
import { TestFixtureError } from './value-extraction/literal-detection'
import { WorkflowStage } from './workflow-stage'
import type { WorkflowStageValue } from './workflow-stage'

describe('WorkflowStage', () => {
  it('detaches code extraction configuration from its mutable input', () => {
    const validatedConfig = configuration().resolvedConfig
    const modules = [...validatedConfig.modules]
    const matchApiBy = ['route']
    const eventPublisher = { fromType: 'publisher', metadataKey: 'eventName' }
    const httpLink = {
      fromCustomType: 'httpCall',
      matchDomainBy: 'domain',
      matchApiBy,
    }
    const config: CodeExtractionConfig = {
      modules,
      connections: { eventPublishers: [eventPublisher], httpLinks: [httpLink] },
      schema: 'schema.json',
    }
    const stage = WorkflowStage.fromCodeExtraction('extract', config)

    modules.length = 0
    eventPublisher.metadataKey = 'changed'
    httpLink.fromCustomType = 'changed'
    matchApiBy.push('changed')

    expect(stage.value).toStrictEqual({
      kind: 'code-extraction',
      name: 'extract',
      config: {
        modules: validatedConfig.modules,
        connections: {
          eventPublishers: [{ fromType: 'publisher', metadataKey: 'eventName' }],
          httpLinks: [
            {
              fromCustomType: 'httpCall',
              matchDomainBy: 'domain',
              matchApiBy: ['route'],
            },
          ],
        },
        schema: 'schema.json',
      },
    })
  })

  it('retains an empty connection configuration', () => {
    const validatedConfig = configuration().resolvedConfig
    const stage = WorkflowStage.fromCodeExtraction('extract', {
      modules: validatedConfig.modules,
      connections: {},
      schema: undefined,
    })

    expect(stage.value).toStrictEqual({
      kind: 'code-extraction',
      name: 'extract',
      config: {
        modules: validatedConfig.modules,
        connections: {},
        schema: undefined,
      },
    })
  })

  it('copies event catalog import configuration from its input', () => {
    const config: EventCatalogImportConfig = {
      source: 'eventcatalog',
      mappings: 'eventcatalog-mappings.yaml',
      allowUnmapped: false,
    }
    const stage = WorkflowStage.fromEventCatalogImport('import-eventcatalog', config)

    expect(eventCatalogConfigOf(stage.value)).toStrictEqual(config)
    expect(eventCatalogConfigOf(stage.value)).not.toBe(config)
  })

  it('copies asyncapi import configuration from its input', () => {
    const config: AsyncApiImportConfig = {
      source: 'asyncapi.yaml',
      mappings: 'asyncapi-mappings.yaml',
      allowUnmapped: false,
    }
    const stage = WorkflowStage.fromAsyncApiImport('import-asyncapi', config)

    expect(asyncApiConfigOf(stage.value)).toStrictEqual(config)
    expect(asyncApiConfigOf(stage.value)).not.toBe(config)
  })

  it('materialises a stage from a prebuilt value', () => {
    const value: WorkflowStageValue = { kind: 'schema-validate', name: 'validate' }
    expect(WorkflowStage.fromMaterialized(value).value).toStrictEqual(value)
  })

  it('copies ai extract configuration from its input', () => {
    const config = aiExtractConfig()
    const stage = WorkflowStage.fromAiExtract('discover-gaps', config)

    expect(aiExtractConfigOf(stage.value)).toStrictEqual(config)
  })

  it('detaches ai extract configuration arrays from its input', () => {
    const config = aiExtractConfig()
    const stage = WorkflowStage.fromAiExtract('discover-gaps', config)
    const copied = aiExtractConfigOf(stage.value)

    expect(sharedAiExtractArraysWith(config, copied)).toStrictEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('copies ai enrich configuration from its input', () => {
    const config = aiEnrichConfig()
    const stage = WorkflowStage.fromAiEnrich('enrich-metadata', config)

    expect(aiEnrichConfigOf(stage.value)).toStrictEqual(config)
  })

  it('detaches ai enrich configuration arrays from its input', () => {
    const config = aiEnrichConfig()
    const stage = WorkflowStage.fromAiEnrich('enrich-metadata', config)
    const copied = aiEnrichConfigOf(stage.value)

    expect(sharedAiEnrichArraysWith(config, copied)).toStrictEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('creates a schema validation stage without configuration', () => {
    const stage = WorkflowStage.fromSchemaValidation('validate')

    expect(stage.value).toStrictEqual({ kind: 'schema-validate', name: 'validate' })
  })
})

function aiExtractConfig(): AiExtractConfig {
  return {
    command: 'claude',
    args: ['-p'],
    timeoutSeconds: 60,
    sources: ['src'],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
  }
}

function aiEnrichConfig(): AiEnrichConfig {
  return {
    command: 'claude',
    args: ['-p'],
    timeoutSeconds: 60,
    sources: ['src'],
    selection: { componentTypes: ['Event'], missingFieldsOnly: true },
    fields: ['eventName'],
    context: { exclude: ['**/*.spec.ts'], maxFilesPerComponent: 10 },
  }
}

function sharedAiExtractArraysWith(original: AiExtractConfig, copied: AiExtractConfig): boolean[] {
  return [
    copied.args === original.args,
    copied.sources === original.sources,
    copied.selection.from === original.selection.from,
    copied.selection.componentTypes === original.selection.componentTypes,
    copied.context.exclude === original.context.exclude,
  ]
}

function sharedAiEnrichArraysWith(original: AiEnrichConfig, copied: AiEnrichConfig): boolean[] {
  return [
    copied.args === original.args,
    copied.sources === original.sources,
    copied.selection.componentTypes === original.selection.componentTypes,
    copied.fields === original.fields,
    copied.context.exclude === original.context.exclude,
  ]
}

function eventCatalogConfigOf(value: WorkflowStageValue): EventCatalogImportConfig {
  if (value.kind !== 'eventcatalog-import') {
    throw new TestFixtureError('Expected an eventcatalog-import stage')
  }
  return value.config
}

function asyncApiConfigOf(value: WorkflowStageValue): AsyncApiImportConfig {
  if (value.kind !== 'asyncapi-import') {
    throw new TestFixtureError('Expected an asyncapi-import stage')
  }
  return value.config
}

function aiExtractConfigOf(value: WorkflowStageValue): AiExtractConfig {
  if (value.kind !== 'ai-extract') throw new TestFixtureError('Expected an ai-extract stage')
  return value.config
}

function aiEnrichConfigOf(value: WorkflowStageValue): AiEnrichConfig {
  if (value.kind !== 'ai-enrich') throw new TestFixtureError('Expected an ai-enrich stage')
  return value.config
}
