import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { assert, describe, expect, it, vi } from 'vitest'
import { ConnectionDetectionResult } from './connection-detection/connection-detection-result'
import { ExtractedLink } from './connection-detection/extracted-link'
import { TestFixtureError } from './value-extraction/literal-detection'
import { Workflow } from './workflow'
import {
  builder,
  component,
  configuration,
  stagesFor,
  workflow,
} from './__fixtures__/workflow-fixtures'
import { WorkflowStage } from './workflow-stage'

describe('Workflow definition', () => {
  it('owns its identity, paths, ready state and configurations', () => {
    const config = configuration()
    const subject = workflow(stagesFor(config))

    expect({
      name: subject.name(),
      outputPath: subject.outputPath(),
      runLogDirectory: subject.runLogDirectory(),
      status: subject.status(),
      configurations: subject.configurations(),
    }).toStrictEqual({
      name: 'build-graph',
      outputPath: '.riviere/graph.json',
      runLogDirectory: '.riviere/logs/workflows',
      status: 'ready',
      configurations: [config, config],
    })
  })

  it('rejects invalid identity, duplicate stage names and invalid stage order', () => {
    const config = configuration()
    const invalidName = Workflow.start({
      name: 'Build Graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: stagesFor(config),
    })
    const duplicate = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.fromExtraction('same', config),
        WorkflowStage.fromLink('same', config),
        WorkflowStage.fromValidation('validate'),
      ],
    })
    const invalidOrder = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.fromLink('link', config),
        WorkflowStage.fromExtraction('extract', config),
        WorkflowStage.fromValidation('validate'),
      ],
    })

    assert(!invalidName.success)
    assert(!duplicate.success)
    assert(!invalidOrder.success)
    expect(invalidName.error.code).toBe('INVALID_WORKFLOW_NAME')
    expect(duplicate.error).toMatchObject({
      code: 'DUPLICATE_STAGE_NAME',
      message: "Duplicate workflow stage name 'same'",
    })
    expect(invalidOrder.error.code).toBe('INVALID_STAGE_ORDER')
  })

  it('rejects validate before link', () => {
    const config = configuration()
    const invalidOrder = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.fromExtraction('extract', config),
        WorkflowStage.fromValidation('validate'),
        WorkflowStage.fromLink('link', config),
      ],
    })

    assert(!invalidOrder.success)
    expect(invalidOrder.error.code).toBe('INVALID_STAGE_ORDER')
  })
})

describe('Workflow.run', () => {
  it('applies all component types, links and warnings in stage order', () => {
    const config = configuration('scheduledJob')
    const subject = workflow(stagesFor(config))
    const graphBuilder = builder()
    const components = [
      component('ui', 'Orders page', { route: '/orders' }),
      component('api', 'Orders API', { apiType: 'REST', method: 'GET', route: '/orders' }),
      component('useCase', 'Place order'),
      component('domainOp', 'Create order', { operationName: 'createOrder' }),
      component('event', 'Order placed', { eventName: 'OrderPlaced' }),
      component('eventHandler', 'Notify customer', { subscribedEvents: ['OrderPlaced'] }),
      component('scheduledJob', 'Expire orders', { schedule: 'daily' }),
    ]

    const result = subject.run(graphBuilder, (stage, accumulated) => {
      if (stage.kind === 'extract') {
        return { success: true, kind: 'components', components, repository: 'shop' }
      }
      expect(accumulated).toStrictEqual(components)
      const graph = graphBuilder.build()
      const source = graph.components[0]
      const target = graph.components[1]
      assert(source)
      assert(target)
      return {
        success: true,
        kind: 'connections',
        connections: ConnectionDetectionResult.parse({
          links: [
            ExtractedLink.parse({
              source: source.id,
              target: target.id,
              type: 'sync',
              sourceLocation: { repository: 'shop', filePath: 'orders.ts', lineNumber: 4 },
            }),
            ExtractedLink.parse({ source: target.id, target: source.id }),
          ],
          externalLinks: [
            {
              source: source.id,
              target: { name: 'Payments API', repository: 'payments' },
              type: 'sync',
              description: 'Charges the order',
              sourceLocation: { repository: 'shop', filePath: 'orders.ts', lineNumber: 5 },
            },
            {
              source: source.id,
              target: { name: 'Payments API', repository: 'payments' },
              type: 'sync',
            },
            {
              source: target.id,
              target: { name: 'Search API' },
            },
          ],
        }),
      }
    })

    assert(result.success)
    expect(graphBuilder.build()).toMatchObject({
      components: expect.arrayContaining([
        expect.objectContaining({ type: 'UI' }),
        expect.objectContaining({ type: 'API' }),
        expect.objectContaining({ type: 'UseCase' }),
        expect.objectContaining({ type: 'DomainOp' }),
        expect.objectContaining({ type: 'Event' }),
        expect.objectContaining({ type: 'EventHandler' }),
        expect.objectContaining({ type: 'Custom', customTypeName: 'scheduledJob' }),
      ]),
      links: expect.arrayContaining([expect.objectContaining({ type: 'sync' })]),
      externalLinks: expect.arrayContaining([
        expect.objectContaining({ description: 'Charges the order' }),
      ]),
    })
    expect(result.warnings).toStrictEqual([
      expect.objectContaining({ code: 'DUPLICATE_LINK_SKIPPED' }),
    ])
    expect({
      eventTypes: result.events.map((event) => event.type),
      firstStage: result.events[1],
      status: subject.status(),
    }).toMatchObject({
      eventTypes: [
        'WorkflowStarted',
        'StageStarted',
        'StageCompleted',
        'StageStarted',
        'StageCompleted',
        'StageStarted',
        'StageCompleted',
        'WorkflowCompleted',
      ],
      firstStage: { stageName: 'extract', stageType: 'extract', stageIndex: 0 },
      status: 'completed',
    })
  })

  it('records scalar overwrite diagnostics and resets run state', () => {
    const config = configuration()
    const subject = workflow([
      WorkflowStage.fromExtraction('first', config),
      WorkflowStage.fromExtraction('second', config),
      WorkflowStage.fromLink('link', config),
      WorkflowStage.fromValidation('validate'),
    ])
    const graphBuilder = builder()
    const execute: Parameters<Workflow['run']>[1] = (stage) => {
      if (stage.kind === 'link') {
        return {
          success: true as const,
          kind: 'connections' as const,
          connections: ConnectionDetectionResult.parse({ links: [], externalLinks: [] }),
        }
      }
      const description = stage.name === 'first' ? 'First' : 'Second'
      const components = [component('useCase', 'Place order', { description })]
      return {
        success: true as const,
        kind: 'components' as const,
        components,
        repository: 'shop',
      }
    }

    const first = subject.run(graphBuilder, execute)
    assert(first.success)
    expect(first.warnings).toStrictEqual([expect.objectContaining({ code: 'SCALAR_OVERWRITE' })])

    const second = subject.run(graphBuilder.fresh(), execute)
    assert(second.success)
    expect(second.events).toHaveLength(10)
  })

  it('passes components from every extraction stage to the link stage', () => {
    const config = configuration()
    const subject = workflow([
      WorkflowStage.fromExtraction('extract-orders', config),
      WorkflowStage.fromExtraction('extract-shipping', config),
      WorkflowStage.fromLink('link', config),
      WorkflowStage.fromValidation('validate'),
    ])
    const orderComponents = [component('useCase', 'Place order')]
    const shippingComponents = [component('useCase', 'Ship order')]
    const linkInputs = new Map<string, readonly ReturnType<typeof component>[]>()

    const result = subject.run(builder(), (stage, accumulatedComponents) => {
      if (stage.kind === 'extract' && stage.name === 'extract-orders') {
        return {
          success: true,
          kind: 'components',
          components: orderComponents,
          repository: 'shop',
        }
      }
      if (stage.kind === 'extract') {
        return {
          success: true,
          kind: 'components',
          components: shippingComponents,
          repository: 'shop',
        }
      }
      linkInputs.set(stage.name, accumulatedComponents)
      return {
        success: true,
        kind: 'connections',
        connections: ConnectionDetectionResult.parse({ links: [], externalLinks: [] }),
      }
    })

    assert(result.success)
    const componentsProvidedToLink = linkInputs.get('link')
    assert(componentsProvidedToLink)
    expect(componentsProvidedToLink).toStrictEqual([...orderComponents, ...shippingComponents])
  })

  it('stops after a typed stage failure', () => {
    const subject = workflow()
    const execute = vi.fn().mockReturnValue({
      success: false,
      errorCode: 'EXTRACTION_FAILED',
      reason: 'Extraction failed',
    })

    const result = subject.run(builder(), execute)

    assert(!result.success)
    expect({
      status: subject.status(),
      calls: execute.mock.calls.length,
      result,
      eventTypes: result.events.map((event) => event.type),
      failure: result.events[2]?.failure,
    }).toMatchObject({
      status: 'failed',
      calls: 1,
      result: { errorCode: 'EXTRACTION_FAILED', reason: 'Extraction failed' },
      eventTypes: ['WorkflowStarted', 'StageStarted', 'StageFailed', 'WorkflowFailed'],
      failure: { reason: 'Extraction failed', errorCode: 'EXTRACTION_FAILED' },
    })
  })

  it('does not validate after the link stage fails', () => {
    const graphBuilder = builder()
    const validate = vi.spyOn(graphBuilder, 'validate')

    const result = workflow().run(graphBuilder, (stage) => {
      if (stage.kind === 'extract') {
        return { success: true, kind: 'components', components: [], repository: 'shop' }
      }
      return {
        success: false,
        errorCode: 'CONNECTION_DETECTION_FAILED',
        reason: 'Connection detection failed',
      }
    })

    expect({
      result,
      validationCalls: validate.mock.calls.length,
      eventTypes: result.events.map((event) => event.type),
    }).toMatchObject({
      result: {
        success: false,
        errorCode: 'CONNECTION_DETECTION_FAILED',
        reason: 'Connection detection failed',
      },
      validationCalls: 0,
      eventTypes: [
        'WorkflowStarted',
        'StageStarted',
        'StageCompleted',
        'StageStarted',
        'StageFailed',
        'WorkflowFailed',
      ],
    })
  })

  it('turns thrown values and component mapping failures into typed failures', () => {
    const thrownError = workflow().run(builder(), () => {
      throw new TestFixtureError('boom')
    })
    const thrownString = workflow().run(builder(), () => {
      throw 'broken'
    })
    const invalidComponent = workflow().run(builder(), (stage) =>
      stage.kind === 'extract'
        ? {
            success: true,
            kind: 'components',
            components: [component('ui', 'Broken UI')],
            repository: 'shop',
          }
        : {
            success: true,
            kind: 'connections',
            connections: ConnectionDetectionResult.parse({ links: [], externalLinks: [] }),
          },
    )

    expect(thrownError).toMatchObject({
      success: false,
      errorCode: 'UNEXPECTED_STAGE_FAILURE',
      reason: 'boom',
    })
    expect(thrownString).toMatchObject({ reason: 'broken' })
    expect(invalidComponent).toMatchObject({
      success: false,
      errorCode: 'GRAPH_APPLICATION_FAILED',
    })
  })

  it('stops when graph validation fails', () => {
    const graphBuilder = builder()
    const invalidGraph = {
      ...graphBuilder.build(),
      links: [{ source: 'missing', target: 'also-missing', type: 'sync' as const }],
    }
    vi.spyOn(graphBuilder, 'validate').mockReturnValue(ValidationResult.parse(invalidGraph))

    const result = workflow().run(graphBuilder, (stage) =>
      stage.kind === 'extract'
        ? { success: true, kind: 'components', components: [], repository: 'shop' }
        : {
            success: true,
            kind: 'connections',
            connections: ConnectionDetectionResult.parse({ links: [], externalLinks: [] }),
          },
    )

    expect(result).toMatchObject({
      success: false,
      errorCode: 'GRAPH_VALIDATION_FAILED',
    })
  })
})
