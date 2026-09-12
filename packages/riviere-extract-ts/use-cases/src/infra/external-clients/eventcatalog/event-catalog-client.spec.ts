import { describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  getDomains: vi.fn(),
  getServices: vi.fn(),
  getEvents: vi.fn(),
}))

vi.mock('@eventcatalog/sdk', () => ({
  default: () => ({
    getDomains: sdk.getDomains,
    getServices: sdk.getServices,
    getEvents: sdk.getEvents,
  }),
}))

import { EventCatalogUnreadableError, readEventCatalog } from './event-catalog-client'

describe('readEventCatalog', () => {
  it('maps SDK domains, services, and events into client documents', async () => {
    sdk.getDomains.mockResolvedValue([
      { id: 'OrdersDomain', name: 'Orders', services: [{ id: 'OrdersService' }] },
    ])
    sdk.getServices.mockResolvedValue([
      {
        id: 'OrdersService',
        name: 'Orders',
        sends: [{ id: 'OrderCreated' }],
        receives: [{ id: 'OrderShipped' }],
      },
    ])
    sdk.getEvents.mockResolvedValue([{ id: 'OrderCreated', name: 'Order Created' }])

    const result = await readEventCatalog('/catalog')

    expect(sdk.getDomains).toHaveBeenCalledWith({ latestOnly: true })
    expect(sdk.getServices).toHaveBeenCalledWith({ latestOnly: true })
    expect(sdk.getEvents).toHaveBeenCalledWith({ latestOnly: true })
    expect(result).toStrictEqual({
      domains: [{ id: 'OrdersDomain', name: 'Orders', serviceIds: ['OrdersService'] }],
      services: [
        {
          id: 'OrdersService',
          name: 'Orders',
          produces: ['OrderCreated'],
          consumes: ['OrderShipped'],
        },
      ],
      events: [{ id: 'OrderCreated', name: 'Order Created' }],
    })
  })

  it('defaults absent domain services and service relationships to empty arrays', async () => {
    sdk.getDomains.mockResolvedValue([{ id: 'OrdersDomain', name: 'Orders' }])
    sdk.getServices.mockResolvedValue([{ id: 'OrdersService', name: 'Orders' }])
    sdk.getEvents.mockResolvedValue([])

    const result = await readEventCatalog('/catalog')

    expect(result).toStrictEqual({
      domains: [{ id: 'OrdersDomain', name: 'Orders', serviceIds: [] }],
      services: [{ id: 'OrdersService', name: 'Orders', produces: [], consumes: [] }],
      events: [],
    })
  })

  it('fails when the catalog cannot be read', async () => {
    sdk.getDomains.mockResolvedValue(undefined)
    sdk.getServices.mockResolvedValue(undefined)
    sdk.getEvents.mockResolvedValue(undefined)

    await expect(readEventCatalog('/missing')).rejects.toThrow(EventCatalogUnreadableError)
  })
})
