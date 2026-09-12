import { assert, describe, expect, it } from 'vitest'
import type { EventCatalogSource } from '../ports/load-event-catalog-source'
import { builder } from '../__fixtures__/workflow-fixtures'
import { collaborators, importConfig } from './__fixtures__/event-catalog-stage-fixtures'
import { executeEventCatalogImportStage } from './execute-event-catalog-import-stage'

describe('executeEventCatalogImportStage', () => {
  it('maps a producing service and its event to canonical components and an async link', async () => {
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
        services: [
          { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome).toStrictEqual({ success: true, diagnostics: [], warnings: [] })
    expect(
      graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
    ).toStrictEqual([
      { id: 'orders:checkout:usecase:placeorder', type: 'UseCase' },
      { id: 'orders:checkout:event:orderplaced', type: 'Event' },
    ])
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
          services: { OrdersService: {} },
          events: { OrderCreated: {} },
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

  it('fails when a mapped service cannot resolve a canonical domain', async () => {
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
      reason:
        "EventCatalog service 'OrdersService' has no canonical domain; add a domain to its mapping",
    })
  })

  it('fails when a mapped event cannot resolve a domain and module', async () => {
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
      reason:
        "EventCatalog event 'OrderCreated' has no canonical domain and module; add them to its mapping or map a producing service",
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

  it('omits a link for a produced event that has no mapping', async () => {
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
        services: [
          { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.links()).toStrictEqual([])
  })
})
