import type {
  AiExtractConfig,
  EventCatalogImportConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import {
  BuilderOptions,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from './riviere-project'
import { InvalidWorkflowDefinitionError } from './riviere-project-errors'
import { WorkflowRunMode } from './workflow'
import { WorkflowStage } from './workflow-stage'
import { collaborators, configuration } from './__fixtures__/workflow-fixtures'

const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}

function graphDefinition() {
  return {
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } as const },
  }
}

function project(stages?: readonly WorkflowStage[]): RiviereProject {
  const result =
    stages === undefined
      ? RiviereProject.start({ graphDefinition: graphDefinition() }, collaborators())
      : RiviereProject.start(
          {
            graphDefinition: graphDefinition(),
            workflowInput: {
              name: 'build-graph',
              outputPath: '/project/.riviere/graph.json',
              runLogDirectory: '/project/.riviere/logs',
              stages,
            },
          },
          collaborators(),
        )
  assert(result.success)
  return result.data
}

function addExistingComponent(subject: RiviereProject): void {
  subject.amendGraph((builder) =>
    builder.addUseCase({
      name: 'Existing graph',
      domain: 'orders',
      module: 'orders',
      sourceLocation: { repository: 'shop', filePath: 'existing.ts' },
    }),
  )
}

describe('RiviereProject Workflow rebuild', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('starts a successful rebuild with fresh graph state', async () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    addExistingComponent(subject)

    const result = await subject.rebuildGraph()

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })

  it('rehydrates persisted graph state', async () => {
    const subject = project()
    addExistingComponent(subject)

    const rehydrated = RiviereProject.rehydrate(subject.build(), collaborators())

    expect(rehydrated.build().components.map((component) => component.name)).toStrictEqual([
      'Existing graph',
    ])
  })

  it('retains Workflow graph metadata when rebuilding', async () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    subject.amendGraph((builder) => {
      builder.addSource({ repository: 'catalogue' })
      builder.addDomain({ name: 'payments', description: 'Payments', systemType: 'domain' })
    })

    const result = await subject.rebuildGraph()

    assert(result.success)
    expect(result.graph.metadata).toStrictEqual({
      name: 'Shop',
      description: 'Shop graph',
      sources: [{ repository: 'shop' }, { repository: 'catalogue' }],
      domains: {
        orders: { description: 'Orders', systemType: 'domain' },
        payments: { description: 'Payments', systemType: 'domain' },
      },
    })
  })

  it('retains completed transition evidence after a later failure', async () => {
    const subject = project([
      WorkflowStage.fromSchemaValidation('validate'),
      WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig),
    ])

    const result = await subject.rebuildGraph()

    assert(!result.success)
    expect(result.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
  })

  it('restores prior state after a later failure', async () => {
    const subject = project([
      WorkflowStage.fromSchemaValidation('validate'),
      WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig),
    ])
    addExistingComponent(subject)

    const result = await subject.rebuildGraph()

    assert(!result.success)
    expect(subject.build().components.map((component) => component.name)).toStrictEqual([
      'Existing graph',
    ])
  })

  it('removes AI stages from the Project rebuild when skip AI mode is selected', async () => {
    const subject = project([
      WorkflowStage.fromAiExtract('discover', aiExtractConfig),
      WorkflowStage.fromSchemaValidation('validate'),
    ])

    const result = await subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    assert(result.success)
    expect(result.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
  })

  it('executes AI stages during a normal Project rebuild', async () => {
    const subject = project([WorkflowStage.fromAiExtract('discover', aiExtractConfig)])

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      reason: "Stage behaviour is unavailable for 'ai-extract'",
    })
  })

  it('returns no completed transition when schema validation fails', async () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    const graph = subject.build()
    vi.spyOn(RiviereBuilder.prototype, 'validate').mockReturnValue(
      ValidationResult.parse({
        ...graph,
        links: [{ source: 'missing', target: 'also-missing', type: 'sync' }],
      }),
    )

    const result = await subject.rebuildGraph()

    assert(!result.success)
    expect({
      errorCode: result.errorCode,
      transitionKinds: result.transitions.map((transition) => transition.value.kind),
    }).toStrictEqual({
      errorCode: 'GRAPH_VALIDATION_FAILED',
      transitionKinds: ['initial'],
    })
  })

  it('returns a typed failure when no workflow is loaded', async () => {
    const result = await project().rebuildGraph()

    expect(result).toMatchObject({ success: false, errorCode: 'WORKFLOW_UNAVAILABLE' })
  })

  it('rehydrates a persisted graph and runs its workflow', async () => {
    const subject = project()
    addExistingComponent(subject)
    const graph = subject.build()
    const rehydrated = RiviereProject.rehydrate(
      graph,
      collaborators(),
      BuilderOptions.fromGraph(graph),
      {
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [WorkflowStage.fromSchemaValidation('validate')],
      },
    )

    const result = await rehydrated.rebuildGraph()

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })

  it('rejects rehydrating with a workflow that has duplicate stage names', async () => {
    const subject = project()
    const graph = subject.build()

    expect(() =>
      RiviereProject.rehydrate(graph, collaborators(), BuilderOptions.fromGraph(graph), {
        name: 'duplicate-stages',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [
          WorkflowStage.fromCodeExtraction('same', configuration().resolvedConfig),
          WorkflowStage.fromSchemaValidation('same'),
        ],
      }),
    ).toThrowError(new InvalidWorkflowDefinitionError("Duplicate workflow stage name 'same'"))
  })

  it('does not start a project with a Workflow that has duplicate stage names', async () => {
    const result = RiviereProject.start(
      {
        graphDefinition: graphDefinition(),
        workflowInput: {
          name: 'duplicate-stages',
          outputPath: 'graph.json',
          runLogDirectory: 'logs',
          stages: [
            WorkflowStage.fromCodeExtraction('same', configuration().resolvedConfig),
            WorkflowStage.fromSchemaValidation('same'),
          ],
        },
      },
      collaborators(),
    )

    expect(result).toMatchObject({
      success: false,
      error: "Duplicate workflow stage name 'same'",
    })
  })

  it('executes an EventCatalog import stage when rebuilding', async () => {
    const eventCatalogConfig: EventCatalogImportConfig = {
      source: 'eventcatalog',
      sourceFilePath: 'eventcatalog',
      allowUnmapped: false,
      mappings: {
        domains: {},
        services: {
          OrdersService: {
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            name: 'PlaceOrder',
          },
        },
        events: { OrderCreated: { name: 'OrderPlaced' } },
      },
    }
    const started = RiviereProject.start(
      {
        graphDefinition: graphDefinition(),
        workflowInput: {
          name: 'build-graph',
          outputPath: 'graph.json',
          runLogDirectory: 'logs',
          stages: [WorkflowStage.fromEventCatalogImport('import', eventCatalogConfig)],
        },
      },
      collaborators({
        domains: [],
        services: [
          { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )
    assert(started.success)

    const result = await started.data.rebuildGraph()

    assert(result.success)
    expect(result.graph.components.map((component) => component.id)).toStrictEqual([
      'orders:checkout:usecase:placeorder',
      'orders:checkout:event:orderplaced',
    ])
  })

  it('fails an EventCatalog stage when no collaborators are supplied', async () => {
    const eventCatalogConfig: EventCatalogImportConfig = {
      source: 'eventcatalog',
      sourceFilePath: 'eventcatalog',
      allowUnmapped: false,
      mappings: { domains: {}, services: {}, events: {} },
    }
    const started = RiviereProject.start({
      graphDefinition: graphDefinition(),
      workflowInput: {
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [WorkflowStage.fromEventCatalogImport('import', eventCatalogConfig)],
      },
    })
    assert(started.success)

    const result = await started.data.rebuildGraph()

    expect(result).toMatchObject({ success: false, errorCode: 'UNEXPECTED_STAGE_FAILURE' })
  })
})
