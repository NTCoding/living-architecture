import { assert, describe, expect, it } from 'vitest'
import { EnrichedComponent, type MetadataValue } from './enriched-component'

function component(type: string, metadata: Record<string, MetadataValue> = {}) {
  return EnrichedComponent.parse({
    type,
    name: `${type} component`,
    domain: 'orders',
    module: 'orders',
    location: { file: 'orders.ts', line: 7 },
    metadata,
    _missing: undefined,
  })
}

function definition(type: string, metadata?: Record<string, MetadataValue>) {
  const result = component(type, metadata).toComponentDefinition('shop')
  assert(result.success)
  return result.data.value
}

describe('EnrichedComponent.toComponentDefinition', () => {
  it('maps every built in component type', () => {
    expect([
      definition('ui', { route: '/orders', description: 'Orders page' }),
      definition('api', { apiType: 'REST', method: 'GET', route: '/orders' }),
      definition('useCase'),
      definition('domainOp', { operationName: 'placeOrder', entity: 'Order' }),
      definition('event', { eventName: 'OrderPlaced', eventSchema: '{}' }),
      definition('eventHandler', { subscribedEvents: ['OrderPlaced'] }),
    ]).toStrictEqual([
      expect.objectContaining({ type: 'UI', input: expect.objectContaining({ route: '/orders' }) }),
      expect.objectContaining({ type: 'API', input: expect.objectContaining({ apiType: 'REST' }) }),
      expect.objectContaining({ type: 'UseCase' }),
      expect.objectContaining({
        type: 'DomainOp',
        input: expect.objectContaining({ entity: 'Order' }),
      }),
      expect.objectContaining({
        type: 'Event',
        input: expect.objectContaining({ eventSchema: '{}' }),
      }),
      expect.objectContaining({
        type: 'EventHandler',
        input: expect.objectContaining({ subscribedEvents: ['OrderPlaced'] }),
      }),
    ])
  })

  it('maps string event subscriptions and optional built in values', () => {
    expect(definition('eventHandler', { subscribedEvents: 'OrderPlaced' })).toMatchObject({
      type: 'EventHandler',
      input: { subscribedEvents: ['OrderPlaced'] },
    })
    expect(definition('event', { eventName: 'OrderPlaced' })).toMatchObject({ type: 'Event' })
    expect(definition('domainOp', { operationName: 'placeOrder' })).toMatchObject({
      type: 'DomainOp',
    })
  })

  it('returns parsing failures when domain operation and event metadata is absent', () => {
    expect(component('event').toComponentDefinition('shop')).toMatchObject({ success: false })
    expect(component('domainOp').toComponentDefinition('shop')).toMatchObject({ success: false })
  })

  it('returns parsing failures when required built in values are unavailable', () => {
    expect(component('ui').toComponentDefinition('shop')).toStrictEqual({
      success: false,
      message: '--route is required for UI component',
    })
    expect(component('api').toComponentDefinition('shop')).toStrictEqual({
      success: false,
      message: '--api-type is required for API component',
    })
    expect(component('eventHandler').toComponentDefinition('shop')).toStrictEqual({
      success: false,
      message: '--subscribed-events is required for EventHandler component',
    })
  })

  it('maps custom components without treating their metadata as built in fields', () => {
    expect(definition('scheduledJob', { schedule: 'daily', retries: 3 })).toStrictEqual({
      type: 'Custom',
      input: {
        name: 'scheduledJob component',
        domain: 'orders',
        module: 'orders',
        sourceLocation: { repository: 'shop', filePath: 'orders.ts', lineNumber: 7 },
        customTypeName: 'scheduledJob',
        metadata: { schedule: 'daily', retries: 3 },
      },
    })
  })
})
