import { assert, describe, expect, it } from 'vitest'
import type { EventCatalogSource } from '../ports/load-event-catalog-source'
import { builder, collaborators } from '../__fixtures__/workflow-fixtures'
import { importConfig } from './__fixtures__/event-catalog-stage-fixtures'
import { executeEventCatalogImportStage } from './execute-event-catalog-import-stage'

class SourceLoadFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceLoadFailure'
  }
}

async function runProducingServiceStage() {
  const graphBuilder = builder()
  const outcome = await executeEventCatalogImportStage(
    graphBuilder,
    importConfig({
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
    }),
    collaborators({
      domains: [],
      services: [{ id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] }],
      events: [{ id: 'OrderCreated', name: 'Order Created' }],
    }),
  )
  return { graphBuilder, outcome }
}

describe('executeEventCatalogImportStage', () => {
  it('maps a producing service to a canonical use case component', async () => {
    const { graphBuilder } = await runProducingServiceStage()

    expect(
      graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
    ).toContainEqual({ id: 'orders:checkout:usecase:placeorder', type: 'UseCase' })
  })

  it('maps a produced event to a canonical event component', async () => {
    const { graphBuilder } = await runProducingServiceStage()

    expect(
      graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
    ).toContainEqual({ id: 'orders:checkout:event:orderplaced', type: 'Event' })
  })

  it('links a producing service to the event it produces', async () => {
    const { graphBuilder } = await runProducingServiceStage()

    expect(
      graphBuilder.links().map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
    ).toStrictEqual([
      {
        source: 'orders:checkout:usecase:placeorder',
        target: 'orders:checkout:event:orderplaced',
        type: 'async',
      },
    ])
  })

  it('derives a service canonical domain from the mapped EventCatalog domain', async () => {
    const graphBuilder = builder()

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        mappings: {
          domains: { OrdersDomain: 'orders' },
          services: {
            OrdersService: { type: 'UseCase', module: 'checkout', name: 'PlaceOrder' },
          },
          events: {},
        },
      }),
      collaborators({
        domains: [{ id: 'OrdersDomain', name: 'Orders', serviceIds: ['OrdersService'] }],
        services: [
          {
            id: 'OrdersService',
            name: 'Orders',
            domainId: 'OrdersDomain',
            produces: [],
            consumes: [],
          },
        ],
        events: [],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.components().map((component) => component.domain)).toStrictEqual(['orders'])
  })

  it('applies an explicit event domain and module from its mapping', async () => {
    const graphBuilder = builder()

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        mappings: {
          domains: {},
          services: {},
          events: { OrderCreated: { domain: 'orders', module: 'checkout', name: 'OrderPlaced' } },
        },
      }),
      collaborators({
        domains: [],
        services: [],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.components().map((component) => component.id)).toStrictEqual([
      'orders:checkout:event:orderplaced',
    ])
  })

  it('fails in strict mode when a source record has no mapping', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig(),
      collaborators({
        domains: [],
        services: [{ id: 'OrdersService', name: 'Orders', produces: [], consumes: [] }],
        events: [],
      }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "Unmapped EventCatalog records: service 'OrdersService'",
    })
  })

  it('skips unmapped records with typed diagnostics in lenient mode', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({ allowUnmapped: true }),
      collaborators({
        domains: [],
        services: [{ id: 'OrdersService', name: 'Orders', produces: [], consumes: [] }],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    assert(outcome.success)
    expect(outcome.diagnostics.map((diagnostic) => diagnostic.value)).toStrictEqual([
      { kind: 'unmapped-record', recordKind: 'service', recordId: 'OrdersService' },
      { kind: 'unmapped-record', recordKind: 'event', recordId: 'OrderCreated' },
    ])
  })

  it('fails when a mapping references an unknown service', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: {
          domains: {},
          services: {
            GhostService: { type: 'UseCase', domain: 'orders', module: 'checkout', name: 'Ghost' },
          },
          events: {},
        },
      }),
      collaborators({ domains: [], services: [], events: [] }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "EventCatalog mappings reference unknown service 'GhostService'",
    })
  })

  it('fails when a mapping references an unknown event', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: {
          domains: {},
          services: {},
          events: { GhostEvent: { name: 'Ghost' } },
        },
      }),
      collaborators({ domains: [], services: [], events: [] }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "EventCatalog mappings reference unknown event 'GhostEvent'",
    })
  })

  it('fails when a mapping references an unknown domain', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: { domains: { GhostDomain: 'ghost' }, services: {}, events: {} },
      }),
      collaborators({ domains: [], services: [], events: [] }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "EventCatalog mappings reference unknown domain 'GhostDomain'",
    })
  })

  it('reports a builder failure as a typed stage failure', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: {
          domains: {},
          services: {
            OrdersService: {
              type: 'UseCase',
              domain: 'missing',
              module: 'checkout',
              name: 'PlaceOrder',
            },
          },
          events: {},
        },
      }),
      collaborators({
        domains: [],
        services: [{ id: 'OrdersService', name: 'Orders', produces: [], consumes: [] }],
        events: [],
      }),
    )

    expect(outcome).toMatchObject({ success: false, errorCode: 'EVENT_CATALOG_IMPORT_FAILED' })
  })

  it('applies convention defaults when a mapping omits identity fields', async () => {
    const graphBuilder = builder()

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        mappings: {
          domains: {},
          services: {},
          events: {},
        },
      }),
      collaborators({
        domains: [{ id: 'orders', name: 'Orders', serviceIds: ['OrdersService'] }],
        services: [
          {
            id: 'OrdersService',
            name: 'OrdersService',
            domainId: 'orders',
            produces: ['OrderCreated'],
            consumes: [],
          },
        ],
        events: [{ id: 'OrderCreated', name: 'OrderCreated' }],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.components().map((component) => component.id)).toStrictEqual([
      'orders:orders-service:usecase:ordersservice',
      'orders:orders-service:event:ordercreated',
    ])
  })

  it('skips a service that cannot resolve a canonical domain', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: {
          domains: {},
          services: {
            OrdersService: { type: 'UseCase', module: 'checkout', name: 'PlaceOrder' },
          },
          events: {},
        },
      }),
      collaborators({
        domains: [],
        services: [{ id: 'OrdersService', name: 'Orders', produces: [], consumes: [] }],
        events: [],
      }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "Unmapped EventCatalog records: service 'OrdersService'",
    })
  })

  it('skips an event that cannot resolve a domain and module', async () => {
    const outcome = await executeEventCatalogImportStage(
      builder(),
      importConfig({
        mappings: {
          domains: {},
          services: {},
          events: { OrderCreated: { name: 'OrderPlaced' } },
        },
      }),
      collaborators({
        domains: [],
        services: [],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: "Unmapped EventCatalog records: event 'OrderCreated'",
    })
  })

  it('skips a duplicate async link already present in the graph', async () => {
    const graphBuilder = builder()
    const source: EventCatalogSource = {
      domains: [],
      services: [{ id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] }],
      events: [{ id: 'OrderCreated', name: 'Order Created' }],
    }
    const config = importConfig({
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
    })

    await executeEventCatalogImportStage(graphBuilder, config, collaborators(source))
    const first = graphBuilder.addUI({
      name: 'First screen',
      domain: 'orders',
      module: 'checkout',
      route: '/first',
      sourceLocation: { repository: 'shop', filePath: 'first.ts' },
    })
    const second = graphBuilder.addUI({
      name: 'Second screen',
      domain: 'orders',
      module: 'checkout',
      route: '/second',
      sourceLocation: { repository: 'shop', filePath: 'second.ts' },
    })
    graphBuilder.link({ from: first.id, to: second.id })
    const rerun = await executeEventCatalogImportStage(graphBuilder, config, collaborators(source))

    expect(rerun.success).toBe(true)
    expect(graphBuilder.links()).toHaveLength(2)
  })

  it('omits a link for a produced event absent from the source', async () => {
    const graphBuilder = builder()

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        allowUnmapped: true,
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
          events: {},
        },
      }),
      collaborators({
        domains: [],
        services: [{ id: 'OrdersService', name: 'Orders', produces: ['GhostEvent'], consumes: [] }],
        events: [],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.links()).toStrictEqual([])
  })

  it('fails with the EventCatalog error code when the source loader rejects', async () => {
    const outcome = await executeEventCatalogImportStage(builder(), importConfig(), {
      loadEventCatalogSource: () => Promise.reject(new SourceLoadFailure('boom')),
      repositoryName: 'shop',
    })

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: 'EventCatalog import failed: SourceLoadFailure: boom',
    })
  })
})
