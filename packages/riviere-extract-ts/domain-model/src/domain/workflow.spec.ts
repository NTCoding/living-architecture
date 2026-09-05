import type {
  AiEnrichConfig,
  AiExtractConfig,
  AsyncApiImportConfig,
  EventCatalogImportConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { assert, describe, expect, it, vi } from 'vitest'
import { TestFixtureError } from './value-extraction/literal-detection'
import { Workflow, WorkflowRunMode } from './workflow'
import { WorkflowDiagnostic } from './workflow-diagnostic'
import { WorkflowStage } from './workflow-stage'
import { builder, configuration } from './__fixtures__/workflow-fixtures'

const codeExtractionConfig = configuration().resolvedConfig
const eventCatalogConfig: EventCatalogImportConfig = {
  source: 'eventcatalog',
  mappings: 'eventcatalog-mappings.yaml',
  allowUnmapped: false,
}
const asyncApiConfig: AsyncApiImportConfig = {
  source: 'asyncapi.yaml',
  mappings: 'asyncapi-mappings.yaml',
  allowUnmapped: false,
}
const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}
const aiEnrichConfig: AiEnrichConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { componentTypes: ['Event'], missingFieldsOnly: true },
  fields: ['eventName'],
  context: { exclude: ['**/*.spec.ts'], maxFilesPerComponent: 10 },
}

function allStages() {
  return [
    WorkflowStage.fromCodeExtraction('extract-code', codeExtractionConfig),
    WorkflowStage.fromEventCatalogImport('import-eventcatalog', eventCatalogConfig),
    WorkflowStage.fromAsyncApiImport('import-asyncapi', asyncApiConfig),
    WorkflowStage.fromAiExtract('discover-gaps', aiExtractConfig),
    WorkflowStage.fromAiEnrich('enrich-metadata', aiEnrichConfig),
    WorkflowStage.fromSchemaValidation('validate'),
  ]
}

function workflow(stages = allStages()): Workflow {
  const result = Workflow.start({
    name: 'build-graph',
    outputPath: '.riviere/graph.json',
    runLogDirectory: '.riviere/logs',
    stages,
  })
  assert(result.success)
  return result.data
}

const successfulStage = {
  success: true,
  diagnostics: [],
  warnings: [],
} as const

describe('Workflow stage language', () => {
  it('retains every closed stage variant and its typed configuration', () => {
    const subject = workflow()
    const retainedCodeExtractionConfig = {
      modules: codeExtractionConfig.modules,
      connections: codeExtractionConfig.connections,
      schema: codeExtractionConfig.schema,
    }

    expect({
      stages: allStages().map((stage) => stage.value),
      extractionConfigurations: subject.configurations(),
    }).toStrictEqual({
      stages: [
        {
          kind: 'code-extraction',
          name: 'extract-code',
          config: retainedCodeExtractionConfig,
        },
        { kind: 'eventcatalog-import', name: 'import-eventcatalog', config: eventCatalogConfig },
        { kind: 'asyncapi-import', name: 'import-asyncapi', config: asyncApiConfig },
        { kind: 'ai-extract', name: 'discover-gaps', config: aiExtractConfig },
        { kind: 'ai-enrich', name: 'enrich-metadata', config: aiEnrichConfig },
        { kind: 'schema-validate', name: 'validate' },
      ],
      extractionConfigurations: [retainedCodeExtractionConfig],
    })
  })
})

describe('Workflow active stage plan', () => {
  it.each([
    [
      'run',
      [
        'code-extraction',
        'eventcatalog-import',
        'asyncapi-import',
        'ai-extract',
        'ai-enrich',
        'schema-validate',
      ],
    ],
    [
      'dry-run',
      [
        'code-extraction',
        'eventcatalog-import',
        'asyncapi-import',
        'ai-extract',
        'ai-enrich',
        'schema-validate',
      ],
    ],
    ['skip-ai', ['code-extraction', 'eventcatalog-import', 'asyncapi-import', 'schema-validate']],
  ] as const)('executes the expected stages in %s mode', (mode, expectedKinds) => {
    const executedKinds: string[] = []

    const result = workflow().run(builder(), WorkflowRunMode.from(mode), (stage) => {
      executedKinds.push(stage.kind)
      return successfulStage
    })

    expect(result.value.success).toBe(true)
    expect(executedKinds).toStrictEqual(expectedKinds)
  })
})

describe('Workflow transition snapshots', () => {
  it('records initial and completed accumulated state after diagnostics are recorded', () => {
    const graphBuilder = builder()
    const subject = workflow([
      WorkflowStage.fromEventCatalogImport('first', eventCatalogConfig),
      WorkflowStage.fromAsyncApiImport('second', asyncApiConfig),
    ])

    const result = subject.run(graphBuilder, WorkflowRunMode.from('run'), (stage) => {
      if (stage.kind === 'eventcatalog-import') {
        graphBuilder.addUseCase({
          name: 'Place order',
          domain: 'orders',
          module: 'checkout',
          sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
        })
        return {
          success: true,
          diagnostics: [
            WorkflowDiagnostic.fromMissingField('place-order', 'description'),
            WorkflowDiagnostic.fromUncertainLink({
              source: 'place-order',
              target: 'create-order',
              sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
            }),
            WorkflowDiagnostic.fromUncertainLink({
              source: 'place-order',
              target: 'send-confirmation',
            }),
          ],
          warnings: [],
        }
      }
      const source = graphBuilder.components().find((component) => component.name === 'Place order')
      assert(source)
      const target = graphBuilder.addDomainOp({
        name: 'Create order',
        operationName: 'createOrder',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'shop', filePath: 'order.ts' },
      })
      graphBuilder.link({ from: source.id, to: target.id, type: 'sync' })
      graphBuilder.linkExternal({
        from: target.id,
        target: { name: 'Payments API', repository: 'payments' },
        type: 'async',
      })
      return successfulStage
    })

    assert(result.value.success)
    graphBuilder.addEvent({
      name: 'Added after run',
      eventName: 'AddedAfterRun',
      domain: 'orders',
      module: 'checkout',
      sourceLocation: { repository: 'shop', filePath: 'later.ts' },
    })
    const transitions = result.value.transitions.map((transition) => transition.value)
    expect(transitions.map((transition) => transition.kind)).toStrictEqual([
      'initial',
      'stage-completed',
      'stage-completed',
    ])
    expect({
      initialState: {
        components: transitions[0]?.state.components,
        diagnostics: transitions[0]?.state.diagnostics,
        externalLinks: transitions[0]?.state.externalLinks,
        links: transitions[0]?.state.links,
      },
      firstComponents: transitions[1]?.state.components.map((component) => component.name),
      firstDiagnostics: transitions[1]?.state.diagnostics.map((diagnostic) => diagnostic.value),
      firstLinks: transitions[1]?.state.links,
      firstExternalLinks: transitions[1]?.state.externalLinks,
      finalComponents: transitions[2]?.state.components.map((component) => component.name),
      finalLinks: transitions[2]?.state.links.map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
      finalExternalLinks: transitions[2]?.state.externalLinks.map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
    }).toStrictEqual({
      initialState: {
        components: [],
        diagnostics: [],
        externalLinks: [],
        links: [],
      },
      firstComponents: ['Place order'],
      firstDiagnostics: [
        { kind: 'missing-field', componentId: 'place-order', field: 'description' },
        {
          kind: 'uncertain-link',
          source: 'place-order',
          target: 'create-order',
          sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
        },
        {
          kind: 'uncertain-link',
          source: 'place-order',
          target: 'send-confirmation',
        },
      ],
      firstLinks: [],
      firstExternalLinks: [],
      finalComponents: ['Place order', 'Create order'],
      finalLinks: [
        {
          source: 'orders:checkout:usecase:place-order',
          target: 'orders:checkout:domainop:create-order',
          type: 'sync',
        },
      ],
      finalExternalLinks: [
        {
          source: 'orders:checkout:domainop:create-order',
          target: { name: 'Payments API', repository: 'payments' },
          type: 'async',
        },
      ],
    })
  })

  it('records unchanged state after schema validation completes', () => {
    const graphBuilder = builder()
    const subject = workflow([
      WorkflowStage.fromEventCatalogImport('import', eventCatalogConfig),
      WorkflowStage.fromSchemaValidation('validate'),
    ])

    const result = subject.run(graphBuilder, WorkflowRunMode.from('run'), (stage) => {
      if (stage.kind === 'eventcatalog-import') {
        graphBuilder.addUseCase({
          name: 'Place order',
          domain: 'orders',
          module: 'checkout',
          sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
        })
      }
      return successfulStage
    })

    assert(result.value.success)
    expect(result.value.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
      'stage-completed',
    ])
    const importTransition = result.value.transitions[1]
    const validationTransition = result.value.transitions[2]
    assert(importTransition)
    assert(validationTransition)
    expect(validationTransition.value.state).toStrictEqual(importTransition.value.state)
  })

  it('retains completed transitions when a later stage fails', () => {
    const execute = vi.fn().mockReturnValueOnce(successfulStage).mockReturnValueOnce({
      success: false,
      errorCode: 'IMPORT_FAILED',
      reason: 'Import failed',
    })
    const subject = workflow([
      WorkflowStage.fromEventCatalogImport('first', eventCatalogConfig),
      WorkflowStage.fromAsyncApiImport('second', asyncApiConfig),
      WorkflowStage.fromSchemaValidation('not-reached'),
    ])

    const result = subject.run(builder(), WorkflowRunMode.from('run'), execute)

    assert(!result.value.success)
    expect(result.value.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
    expect(execute).toHaveBeenCalledTimes(2)
    expect(subject.status()).toBe('failed')
  })

  it('records no completed transition when the first stage fails', () => {
    const result = workflow([WorkflowStage.fromAiExtract('fail', aiExtractConfig)]).run(
      builder(),
      WorkflowRunMode.from('run'),
      () => ({ success: false, errorCode: 'AI_FAILED', reason: 'AI failed' }),
    )

    assert(!result.value.success)
    expect(result.value.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
    ])
  })
})

describe('Workflow failure events', () => {
  it('turns a thrown Error into a typed stage and Workflow failure', () => {
    const result = workflow([WorkflowStage.fromSchemaValidation('validate')]).run(
      builder(),
      WorkflowRunMode.from('run'),
      () => {
        throw new TestFixtureError('boom')
      },
    )

    assert(!result.value.success)
    expect(result.value).toMatchObject({
      errorCode: 'UNEXPECTED_STAGE_FAILURE',
      reason: 'boom',
    })
    expect(result.value.events.map((event) => event.type)).toStrictEqual([
      'WorkflowStarted',
      'StageStarted',
      'StageFailed',
      'WorkflowFailed',
    ])
  })

  it('turns a thrown primitive into a typed failure reason', () => {
    const result = workflow([WorkflowStage.fromSchemaValidation('validate')]).run(
      builder(),
      WorkflowRunMode.from('run'),
      () => {
        throw 'broken'
      },
    )

    assert(!result.value.success)
    expect(result.value.reason).toBe('broken')
  })
})
