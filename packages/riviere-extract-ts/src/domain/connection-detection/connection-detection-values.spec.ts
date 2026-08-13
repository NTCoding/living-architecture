import { describe, expect, it } from 'vitest'
import { buildComponent } from './call-graph/call-graph-fixtures'
import {
  ConnectionDetectionOptions,
  CrossModuleConnectionOptions,
  PerModuleConnectionOptions,
} from './connection-detection-values'

describe('ConnectionDetectionOptions', () => {
  it('stores all constructor fields when event publishers and http links are provided', () => {
    const eventPublishers = [
      {
        fromType: 'eventSender',
        metadataKey: 'publishedEventType',
      },
    ]
    const httpLinks = [
      {
        fromCustomType: 'httpCall',
        matchDomainBy: 'serviceName',
        matchApiBy: ['route'],
      },
    ]

    const result = ConnectionDetectionOptions.parse({
      allowIncomplete: true,
      sourceFilePaths: ['/src/orders/order.ts'],
      eventPublishers,
      httpLinks,
      repository: 'test-repo',
    })

    expect(result).toMatchObject({
      allowIncomplete: true,
      sourceFilePaths: ['/src/orders/order.ts'],
      eventPublishers,
      httpLinks,
      repository: 'test-repo',
    })
  })
})

describe('PerModuleConnectionOptions', () => {
  it('stores all constructor fields when all components and http links are provided', () => {
    const component = buildComponent('OrderService', '/src/order-service.ts', 1)
    const httpLinks = [
      {
        fromCustomType: 'httpCall',
        matchDomainBy: 'serviceName',
        matchApiBy: ['route'],
      },
    ]

    const result = PerModuleConnectionOptions.parse({
      allComponents: [component],
      allowIncomplete: true,
      sourceFilePaths: ['/src/orders/order-service.ts'],
      httpLinks,
      repository: 'test-repo',
    })

    expect(result).toMatchObject({
      allComponents: [component],
      allowIncomplete: true,
      sourceFilePaths: ['/src/orders/order-service.ts'],
      httpLinks,
      repository: 'test-repo',
    })
  })
})

describe('CrossModuleConnectionOptions', () => {
  it('stores all constructor fields when event publishers are provided', () => {
    const eventPublishers = [
      {
        fromType: 'eventSender',
        metadataKey: 'publishedEventType',
      },
    ]

    const result = CrossModuleConnectionOptions.parse({
      allowIncomplete: false,
      eventPublishers,
      repository: 'test-repo',
    })

    expect(result.allowIncomplete).toBe(false)
    expect(result.eventPublishers).toStrictEqual(eventPublishers)
    expect(result.repository).toBe('test-repo')
  })
})
