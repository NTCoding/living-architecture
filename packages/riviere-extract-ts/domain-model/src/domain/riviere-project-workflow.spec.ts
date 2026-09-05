import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from './riviere-project'
import { WorkflowRunMode } from './workflow'
import { WorkflowStage } from './workflow-stage'
import { configuration } from './__fixtures__/workflow-fixtures'

const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}

function project(stages: readonly WorkflowStage[]): RiviereProject {
  const subject = RiviereProject.start({
    graphDefinition: {
      name: 'Shop',
      description: 'Shop graph',
      sources: [{ repository: 'shop' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
    },
  }).data
  const result = subject.addWorkflow({
    name: 'build-graph',
    outputPath: '/project/.riviere/graph.json',
    runLogDirectory: '/project/.riviere/logs',
    stages,
  })
  assert(result.success)
  return subject
}

function addExistingComponent(subject: RiviereProject): void {
  subject.addComponent({
    type: 'UseCase',
    input: {
      name: 'Existing graph',
      domain: 'orders',
      module: 'orders',
      sourceLocation: { repository: 'shop', filePath: 'existing.ts' },
    },
  })
}

describe('RiviereProject Workflow rebuild', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('starts a successful rebuild with fresh graph state', () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    addExistingComponent(subject)

    const result = subject.rebuildGraph('build-graph')

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })

  it('rehydrates persisted graph state', () => {
    const subject = project([])
    addExistingComponent(subject)

    const rehydrated = RiviereProject.rehydrate(subject.build())

    expect(rehydrated.build().components.map((component) => component.name)).toStrictEqual([
      'Existing graph',
    ])
  })

  it('retains Workflow graph metadata when rebuilding', () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    subject.addSource({ repository: 'catalogue' })
    subject.addDomain({ name: 'payments', description: 'Payments', systemType: 'domain' })

    const result = subject.rebuildGraph('build-graph')

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

  it('retains completed transition evidence and restores prior state after a later failure', () => {
    const subject = project([
      WorkflowStage.fromSchemaValidation('validate'),
      WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig),
    ])
    addExistingComponent(subject)

    const result = subject.rebuildGraph('build-graph')

    assert(!result.success)
    expect({
      errorCode: result.errorCode,
      transitionKinds: result.transitions.map((transition) => transition.value.kind),
      restoredComponents: subject.build().components.map((component) => component.name),
    }).toStrictEqual({
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      transitionKinds: ['initial', 'stage-completed'],
      restoredComponents: ['Existing graph'],
    })
  })

  it('removes AI stages from the Project rebuild when skip AI mode is selected', () => {
    const subject = project([
      WorkflowStage.fromAiExtract('discover', aiExtractConfig),
      WorkflowStage.fromSchemaValidation('validate'),
    ])

    const result = subject.rebuildGraph('build-graph', WorkflowRunMode.from('skip-ai'))

    assert(result.success)
    expect(result.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
  })

  it('executes AI stages during a normal Project rebuild', () => {
    const subject = project([WorkflowStage.fromAiExtract('discover', aiExtractConfig)])

    const result = subject.rebuildGraph('build-graph', WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      reason: "Stage behaviour is unavailable for 'ai-extract'",
    })
  })

  it('returns no completed transition when schema validation fails', () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    const graph = subject.build()
    vi.spyOn(RiviereBuilder.prototype, 'validate').mockReturnValue(
      ValidationResult.parse({
        ...graph,
        links: [{ source: 'missing', target: 'also-missing', type: 'sync' }],
      }),
    )

    const result = subject.rebuildGraph('build-graph')

    assert(!result.success)
    expect({
      errorCode: result.errorCode,
      transitionKinds: result.transitions.map((transition) => transition.value.kind),
    }).toStrictEqual({
      errorCode: 'GRAPH_VALIDATION_FAILED',
      transitionKinds: ['initial'],
    })
  })

  it('returns typed failures for an unknown Workflow and unavailable graph state', () => {
    const subject = project([])
    const extractionProject = RiviereProject.start({
      configuration: configuration(),
      draftComponents: [],
    })
    assert(extractionProject.success)
    assert(
      extractionProject.data.addWorkflow({
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [WorkflowStage.fromSchemaValidation('validate')],
      }).success,
    )

    expect({
      unknown: subject.rebuildGraph('missing'),
      unavailable: extractionProject.data.rebuildGraph('build-graph'),
    }).toMatchObject({
      unknown: { success: false, errorCode: 'WORKFLOW_NOT_FOUND' },
      unavailable: { success: false, errorCode: 'GRAPH_STATE_UNAVAILABLE' },
    })
  })

  it('does not add a Workflow with duplicate stage names', () => {
    const subject = project([])

    const result = subject.addWorkflow({
      name: 'duplicate-stages',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.fromCodeExtraction('same', configuration().resolvedConfig),
        WorkflowStage.fromSchemaValidation('same'),
      ],
    })

    expect(result).toMatchObject({ success: false })
  })
})
