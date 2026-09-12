import { describe, expect, it } from 'vitest'
import { builder } from '../__fixtures__/workflow-fixtures'
import { collaborators, importConfig } from './__fixtures__/event-catalog-stage-fixtures'
import { executeEventCatalogImportStage } from './execute-event-catalog-import-stage'

describe('executeEventCatalogImportStage consumer outcomes', () => {
  it('adds an event handler and links the consumed event to it', async () => {
    const graphBuilder = builder()
    graphBuilder.addDomain({ name: 'shipping', description: 'Shipping', systemType: 'domain' })

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
            ShippingService: {
              type: 'UseCase',
              domain: 'shipping',
              module: 'fulfillment',
              name: 'ShipOrder',
            },
          },
          events: { OrderCreated: { name: 'OrderPlaced' } },
        },
      }),
      collaborators({
        domains: [],
        services: [
          { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
          { id: 'ShippingService', name: 'Shipping', produces: [], consumes: ['OrderCreated'] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(
      graphBuilder.components().map((component) => ({
        id: component.id,
        type: component.type,
      })),
    ).toStrictEqual([
      { id: 'orders:checkout:usecase:placeorder', type: 'UseCase' },
      { id: 'shipping:fulfillment:usecase:shiporder', type: 'UseCase' },
      { id: 'orders:checkout:event:orderplaced', type: 'Event' },
      { id: 'shipping:fulfillment:eventhandler:shiporder', type: 'EventHandler' },
    ])
    expect(
      graphBuilder.components().find((component) => component.type === 'EventHandler'),
    ).toMatchObject({ subscribedEvents: ['OrderPlaced'] })
    expect(graphBuilder.links().map((link) => [link.source, link.target, link.type])).toStrictEqual(
      [
        ['orders:checkout:usecase:placeorder', 'orders:checkout:event:orderplaced', 'async'],
        [
          'orders:checkout:event:orderplaced',
          'shipping:fulfillment:eventhandler:shiporder',
          'async',
        ],
      ],
    )
  })

  it('omits a handler and link for a consumed event that has no mapping', async () => {
    const graphBuilder = builder()
    graphBuilder.addDomain({ name: 'shipping', description: 'Shipping', systemType: 'domain' })

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        allowUnmapped: true,
        mappings: {
          domains: {},
          services: {
            ShippingService: {
              type: 'UseCase',
              domain: 'shipping',
              module: 'fulfillment',
              name: 'ShipOrder',
            },
          },
          events: {},
        },
      }),
      collaborators({
        domains: [],
        services: [
          { id: 'ShippingService', name: 'Shipping', produces: [], consumes: ['OrderCreated'] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.links()).toStrictEqual([])
  })
})
