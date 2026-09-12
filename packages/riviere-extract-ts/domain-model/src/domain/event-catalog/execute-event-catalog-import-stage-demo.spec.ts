import { describe, expect, it } from 'vitest'
import { builder, collaborators } from '../__fixtures__/workflow-fixtures'
import { demoEventCatalogSource, importConfig } from './__fixtures__/event-catalog-stage-fixtures'
import { executeEventCatalogImportStage } from './execute-event-catalog-import-stage'

describe('executeEventCatalogImportStage demo fixture', () => {
  it('imports the EventCatalog demo fixture through the mapping overrides', async () => {
    const graphBuilder = builder()
    graphBuilder.addDomain({
      name: 'orders-domain',
      description: 'Orders domain',
      systemType: 'domain',
    })

    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({
        sourceFilePath: 'specs/eventcatalog',
        mappings: {
          domains: {},
          services: {
            OrdersService: {
              type: 'UseCase',
              domain: 'orders-domain',
              module: 'infrastructure',
              name: 'PlaceOrder',
            },
          },
          events: { OrderCreated: { name: 'OrderPlaced' } },
        },
      }),
      collaborators(demoEventCatalogSource),
    )

    expect(outcome.success).toBe(true)
    expect(
      graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
    ).toStrictEqual([
      { id: 'orders-domain:infrastructure:usecase:placeorder', type: 'UseCase' },
      { id: 'orders-domain:infrastructure:event:orderplaced', type: 'Event' },
    ])
  })
})
