import { assert, describe, expect, it } from 'vitest'
import { builder, collaborators } from '../__fixtures__/workflow-fixtures'
import { importConfig } from './__fixtures__/event-catalog-stage-fixtures'
import { executeEventCatalogImportStage } from './execute-event-catalog-import-stage'

describe('executeEventCatalogImportStage domain compatibility', () => {
  it('fails without writing when a lenient service falls back to an undeclared domain', async () => {
    const graphBuilder = builder()
    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
      importConfig({ allowUnmapped: true }),
      collaborators({
        domains: [],
        services: [
          {
            id: 'PaymentService',
            name: 'Payments',
            domainId: 'payments',
            produces: [],
            consumes: [],
          },
        ],
        events: [],
      }),
    )

    assert(!outcome.success)
    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'UNDECLARED_IMPORT_DOMAIN',
      reason: "EventCatalog import writes undeclared domains: 'payments' for component 'Payments'",
    })
    expect(graphBuilder.components()).toStrictEqual([])
  })

  it('fails without writing when a mapping references an undeclared domain', async () => {
    const graphBuilder = builder()
    const outcome = await executeEventCatalogImportStage(
      graphBuilder,
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

    assert(!outcome.success)
    expect(outcome.errorCode).toBe('UNDECLARED_IMPORT_DOMAIN')
    expect(outcome.reason).toBe(
      "EventCatalog import writes undeclared domains: 'missing' for component 'PlaceOrder'",
    )
    expect(graphBuilder.components()).toStrictEqual([])
  })
})
