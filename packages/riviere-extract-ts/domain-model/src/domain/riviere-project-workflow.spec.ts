import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtractionConfiguration } from './extraction-configuration'
import { DraftComponent } from './component-extraction/draft-component'
import { RiviereModule } from './riviere-module'
import { RiviereProject } from './riviere-project'
import {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
} from './value-extraction/enriched-component'
import { WorkflowStage } from './workflow-stage'

function configuration(domain: string): ExtractionConfiguration {
  const parsed = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain,
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: domain,
        path: '.',
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(parsed.success)
  const module = parsed.data.modules[0]
  assert(module)
  return ExtractionConfiguration.parse({
    name: domain,
    configPath: `${domain}.yml`,
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: parsed.data,
    moduleContexts: [{ module, project: new Project(), files: [] }],
  })
}

function component(domain: string, name: string): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    domain,
    module: domain,
    location: { file: `${domain}.ts`, line: 1 },
    metadata: {},
    _missing: undefined,
  })
}

function workflowDefinition(
  orderConfig = configuration('orders'),
  shippingConfig = configuration('shipping'),
  linkConfig = orderConfig,
) {
  return {
    name: 'build-graph',
    outputPath: '/project/.riviere/graph.json',
    runLogDirectory: '/project/.riviere/logs/workflows',
    stages: [
      WorkflowStage.fromExtraction('extract-orders', orderConfig),
      WorkflowStage.fromExtraction('extract-shipping', shippingConfig),
      WorkflowStage.fromLink('link', linkConfig),
      WorkflowStage.fromValidation('validate'),
    ],
  }
}

function project(workflows = [workflowDefinition()]): RiviereProject {
  const subject = RiviereProject.start({
    graphDefinition: {
      name: 'Shop',
      description: 'Shop graph',
      sources: [{ repository: 'shop' }],
      domains: {
        orders: { description: 'Orders', systemType: 'domain' },
        shipping: { description: 'Shipping', systemType: 'domain' },
      },
    },
  }).data
  for (const definition of workflows) assert(subject.addWorkflow(definition).success)
  return subject
}

describe('RiviereProject workflow graph rebuild', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('accumulates components from multiple extraction configurations in one graph', () => {
    vi.spyOn(RiviereModule.prototype, 'extractAllDraftComponents').mockReturnValue([])
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents')
      .mockReturnValueOnce(
        EnrichmentResult.parse({ components: [component('orders', 'Place order')], failures: [] }),
      )
      .mockReturnValueOnce(
        EnrichmentResult.parse({
          components: [component('shipping', 'Ship order')],
          failures: [],
        }),
      )
    const subject = project()

    const result = subject.rebuildGraph('build-graph')

    assert(result.success)
    expect(result.graph.components).toStrictEqual([
      expect.objectContaining({ name: 'Place order', domain: 'orders' }),
      expect.objectContaining({ name: 'Ship order', domain: 'shipping' }),
    ])
    expect(result).toMatchObject({
      outputPath: '/project/.riviere/graph.json',
      runLogDirectory: '/project/.riviere/logs/workflows',
      warnings: [],
    })
    expect(subject.build()).toStrictEqual(result.graph)
  })

  it('detects links through the configurations that completed extraction', () => {
    const orders = configuration('orders')
    const shipping = configuration('shipping')
    const link = configuration('link-rules')
    const fromConfiguration = vi.spyOn(RiviereModule, 'fromConfiguration')
    vi.spyOn(RiviereModule.prototype, 'extractAllDraftComponents').mockReturnValue([])
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      EnrichmentResult.parse({ components: [], failures: [] }),
    )
    const subject = project([workflowDefinition(orders, shipping, link)])

    const result = subject.rebuildGraph('build-graph')

    assert(result.success)
    expect(fromConfiguration.mock.calls.map(([configuration]) => configuration.name)).toStrictEqual(
      ['orders', 'shipping', 'orders', 'shipping'],
    )
  })

  it('starts repeated runs with fresh graph construction state', () => {
    vi.spyOn(RiviereModule.prototype, 'extractAllDraftComponents').mockReturnValue([])
    const enrich = vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents')
    enrich
      .mockReturnValueOnce(
        EnrichmentResult.parse({ components: [component('orders', 'First run')], failures: [] }),
      )
      .mockReturnValueOnce(EnrichmentResult.parse({ components: [], failures: [] }))
      .mockReturnValueOnce(
        EnrichmentResult.parse({ components: [component('orders', 'Second run')], failures: [] }),
      )
      .mockReturnValueOnce(EnrichmentResult.parse({ components: [], failures: [] }))
    const subject = project()

    const first = subject.rebuildGraph('build-graph')
    const second = subject.rebuildGraph('build-graph')

    assert(first.success)
    assert(second.success)
    expect(first.graph.components.map((item) => item.name)).toStrictEqual(['First run'])
    expect(second.graph.components.map((item) => item.name)).toStrictEqual(['Second run'])
  })

  it('leaves the previous completed graph unchanged after a failed rebuild', () => {
    const subject = project()
    subject.addComponent({
      type: 'UseCase',
      input: {
        name: 'Existing graph',
        domain: 'orders',
        module: 'orders',
        sourceLocation: { repository: 'shop', filePath: 'existing.ts' },
      },
    })
    vi.spyOn(RiviereModule.prototype, 'extractAllDraftComponents').mockReturnValue([])
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      EnrichmentResult.parse({
        components: [],
        failures: [
          EnrichmentFailure.parse({
            component: DraftComponent.parseOrThrow({
              type: 'useCase',
              name: 'Broken',
              domain: 'orders',
              module: 'orders',
              location: { file: 'broken.ts', line: 1 },
            }),
            field: 'name',
            error: 'Missing name',
          }),
        ],
      }),
    )

    const result = subject.rebuildGraph('build-graph')

    expect(result).toMatchObject({ success: false, errorCode: 'FIELD_ENRICHMENT_FAILED' })
    expect(subject.build().components.map((item) => item.name)).toStrictEqual(['Existing graph'])
  })

  it('returns typed failures for an unknown workflow and unavailable graph state', () => {
    expect(project([]).rebuildGraph('missing')).toMatchObject({
      success: false,
      errorCode: 'WORKFLOW_NOT_FOUND',
    })

    const config = configuration('orders')
    const extractionProject = RiviereProject.start({ configuration: config, draftComponents: [] })
    assert(extractionProject.success)
    assert(extractionProject.data.addWorkflow(workflowDefinition(config, config)).success)
    expect(extractionProject.data.rebuildGraph('build-graph')).toMatchObject({
      success: false,
      errorCode: 'GRAPH_STATE_UNAVAILABLE',
    })
  })

  it('does not add an invalid workflow', () => {
    const subject = project([])

    expect(
      subject.addWorkflow({
        ...workflowDefinition(),
        stages: [
          WorkflowStage.fromValidation('validate'),
          WorkflowStage.fromValidation('validate'),
        ],
      }),
    ).toMatchObject({ success: false })
    expect(subject.rebuildGraph('build-graph')).toMatchObject({
      success: false,
      errorCode: 'WORKFLOW_NOT_FOUND',
    })
  })

  it('can rebuild after repository rehydration without reusing persisted components', () => {
    vi.spyOn(RiviereModule.prototype, 'extractAllDraftComponents').mockReturnValue([])
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      EnrichmentResult.parse({ components: [], failures: [] }),
    )
    const persisted = project([])
    persisted.addComponent({
      type: 'UseCase',
      input: {
        name: 'Persisted component',
        domain: 'orders',
        module: 'orders',
        sourceLocation: { repository: 'shop', filePath: 'persisted.ts' },
      },
    })
    const rehydrated = RiviereProject.rehydrate(persisted.build())
    assert(rehydrated.addWorkflow(workflowDefinition()).success)

    const result = rehydrated.rebuildGraph('build-graph')

    assert(result.success)
    expect(result.graph.components).toStrictEqual([])
  })
})
