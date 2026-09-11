import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from './riviere-project'
import { InvalidWorkflowDefinitionError } from './riviere-project-errors'
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
      ? RiviereProject.start({ graphDefinition: graphDefinition() })
      : RiviereProject.start({
          graphDefinition: graphDefinition(),
          workflowInput: {
            name: 'build-graph',
            outputPath: '/project/.riviere/graph.json',
            runLogDirectory: '/project/.riviere/logs',
            stages,
          },
        })
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

  it('starts a successful rebuild with fresh graph state', () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    addExistingComponent(subject)

    const result = subject.rebuildGraph()

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })

  it('rehydrates persisted graph state', () => {
    const subject = project()
    addExistingComponent(subject)

    const rehydrated = RiviereProject.rehydrate(subject.build())

    expect(rehydrated.build().components.map((component) => component.name)).toStrictEqual([
      'Existing graph',
    ])
  })

  it('retains Workflow graph metadata when rebuilding', () => {
    const subject = project([WorkflowStage.fromSchemaValidation('validate')])
    subject.amendGraph((builder) => {
      builder.addSource({ repository: 'catalogue' })
      builder.addDomain({ name: 'payments', description: 'Payments', systemType: 'domain' })
    })

    const result = subject.rebuildGraph()

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

  it('retains completed transition evidence after a later failure', () => {
    const subject = project([
      WorkflowStage.fromSchemaValidation('validate'),
      WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig),
    ])

    const result = subject.rebuildGraph()

    assert(!result.success)
    expect(result.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
  })

  it('restores prior state after a later failure', () => {
    const subject = project([
      WorkflowStage.fromSchemaValidation('validate'),
      WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig),
    ])
    addExistingComponent(subject)

    const result = subject.rebuildGraph()

    assert(!result.success)
    expect(subject.build().components.map((component) => component.name)).toStrictEqual([
      'Existing graph',
    ])
  })

  it('removes AI stages from the Project rebuild when skip AI mode is selected', () => {
    const subject = project([
      WorkflowStage.fromAiExtract('discover', aiExtractConfig),
      WorkflowStage.fromSchemaValidation('validate'),
    ])

    const result = subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    assert(result.success)
    expect(result.transitions.map((transition) => transition.value.kind)).toStrictEqual([
      'initial',
      'stage-completed',
    ])
  })

  it('executes AI stages during a normal Project rebuild', () => {
    const subject = project([WorkflowStage.fromAiExtract('discover', aiExtractConfig)])

    const result = subject.rebuildGraph(WorkflowRunMode.from('run'))

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

    const result = subject.rebuildGraph()

    assert(!result.success)
    expect({
      errorCode: result.errorCode,
      transitionKinds: result.transitions.map((transition) => transition.value.kind),
    }).toStrictEqual({
      errorCode: 'GRAPH_VALIDATION_FAILED',
      transitionKinds: ['initial'],
    })
  })

  it('returns a typed failure when no workflow is loaded', () => {
    const result = project().rebuildGraph()

    expect(result).toMatchObject({ success: false, errorCode: 'WORKFLOW_UNAVAILABLE' })
  })

  it('rehydrates a persisted graph and runs its workflow', () => {
    const subject = project()
    addExistingComponent(subject)
    const graph = subject.build()
    const rehydrated = RiviereProject.rehydrate(graph, RiviereBuilder.graphOptionsFrom(graph), {
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [WorkflowStage.fromSchemaValidation('validate')],
    })

    const result = rehydrated.rebuildGraph()

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })

  it('rejects rehydrating with a workflow that has duplicate stage names', () => {
    const subject = project()
    const graph = subject.build()

    expect(() =>
      RiviereProject.rehydrate(graph, RiviereBuilder.graphOptionsFrom(graph), {
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

  it('does not start a project with a Workflow that has duplicate stage names', () => {
    const result = RiviereProject.start({
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
    })

    expect(result).toMatchObject({
      success: false,
      error: "Duplicate workflow stage name 'same'",
    })
  })
})
