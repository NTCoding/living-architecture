import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ readEventCatalog: vi.fn() }))

vi.mock('../../../../infra/external-clients/eventcatalog/event-catalog-client', () => ({
  readEventCatalog: client.readEventCatalog,
}))

import { createEventCatalogSourceAdapter } from './event-catalog-source-adapter'

describe('createEventCatalogSourceAdapter', () => {
  it('derives each service domain from the EventCatalog domain that lists it', async () => {
    client.readEventCatalog.mockResolvedValue({
      domains: [{ id: 'OrdersDomain', name: 'Orders', serviceIds: ['OrdersService'] }],
      services: [{ id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] }],
      events: [{ id: 'OrderCreated', name: 'Order Created' }],
    })

    const result = await createEventCatalogSourceAdapter()('/catalog')

    expect(client.readEventCatalog).toHaveBeenCalledWith('/catalog')
    expect(result).toStrictEqual({
      domains: [{ id: 'OrdersDomain', name: 'Orders', serviceIds: ['OrdersService'] }],
      services: [
        {
          id: 'OrdersService',
          name: 'Orders',
          domainId: 'OrdersDomain',
          produces: ['OrderCreated'],
          consumes: [],
        },
      ],
      events: [{ id: 'OrderCreated', name: 'Order Created' }],
    })
  })

  it('omits the domain id when no domain lists the service', async () => {
    client.readEventCatalog.mockResolvedValue({
      domains: [],
      services: [{ id: 'OrphanService', name: 'Orphan', produces: [], consumes: [] }],
      events: [],
    })

    const result = await createEventCatalogSourceAdapter()('/catalog')

    expect(result.services).toStrictEqual([
      { id: 'OrphanService', name: 'Orphan', produces: [], consumes: [] },
    ])
  })
})
