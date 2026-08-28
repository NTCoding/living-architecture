import { ComponentDefinition } from './component-definition'

function input(componentType: string) {
  return {
    componentType,
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    repository: 'test/repository',
    filePath: 'src/component.ts',
  }
}

describe('ComponentDefinition command input parsing', () => {
  it('rejects an unknown component type', () => {
    const result = ComponentDefinition.parse(input('Unknown'))
    expect(result.success).toBe(false)
  })

  it('parses UI input and requires a route', () => {
    const valid = ComponentDefinition.parse({ ...input('ui'), route: ' /orders ' })
    const invalid = ComponentDefinition.parse(input('UI'))
    expect(valid.success && valid.data.value).toStrictEqual({
      type: 'UI',
      input: {
        name: 'Component',
        domain: 'orders',
        module: 'checkout',
        route: '/orders',
        sourceLocation: { repository: 'test/repository', filePath: 'src/component.ts' },
      },
    })
    expect(invalid.success).toBe(false)
  })

  it('parses API and UseCase input', () => {
    const api = ComponentDefinition.parse({
      ...input('API'),
      apiType: 'rest',
      httpMethod: 'get',
      httpPath: '/orders',
    })
    const invalidApi = ComponentDefinition.parse({ ...input('API'), apiType: 'invalid' })
    const useCase = ComponentDefinition.parse(input('UseCase'))
    expect(api.success && api.data.value.type).toBe('API')
    expect(invalidApi.success).toBe(false)
    expect(useCase.success && useCase.data.value.type).toBe('UseCase')
  })

  it('omits API values that were not supplied', () => {
    const result = ComponentDefinition.parse({ ...input('API'), apiType: 'GraphQL' })
    expect(result.success && result.data.value).not.toHaveProperty('input.httpMethod')
    expect(result.success && result.data.value).not.toHaveProperty('input.path')
  })

  it('parses DomainOp input and requires an operation name', () => {
    const valid = ComponentDefinition.parse({
      ...input('DomainOp'),
      operationName: ' placeOrder ',
      entity: 'Order',
    })
    const invalid = ComponentDefinition.parse(input('DomainOp'))
    expect(valid.success && valid.data.value).toMatchObject({
      type: 'DomainOp',
      input: { operationName: 'placeOrder', entity: 'Order' },
    })
    expect(invalid.success).toBe(false)
  })

  it('parses Event input and requires an event name', () => {
    const valid = ComponentDefinition.parse({
      ...input('Event'),
      eventName: ' OrderPlaced ',
      eventSchema: '{}',
    })
    const invalid = ComponentDefinition.parse(input('Event'))
    expect(valid.success && valid.data.value).toMatchObject({
      type: 'Event',
      input: { eventName: 'OrderPlaced', eventSchema: '{}' },
    })
    expect(invalid.success).toBe(false)
  })

  it('parses EventHandler input and validates subscribed events', () => {
    const valid = ComponentDefinition.parse({
      ...input('EventHandler'),
      subscribedEvents: 'OrderPlaced, OrderCancelled',
    })
    const invalid = ComponentDefinition.parse(input('EventHandler'))
    expect(valid.success && valid.data.value).toMatchObject({
      type: 'EventHandler',
      input: { subscribedEvents: ['OrderPlaced', 'OrderCancelled'] },
    })
    expect(invalid.success).toBe(false)
  })

  it('parses Custom input and validates custom properties', () => {
    const valid = ComponentDefinition.parse({
      ...input('Custom'),
      customType: ' Queue ',
      customProperty: ['owner:orders'],
      description: 'Queue component',
      lineNumber: 10,
      columnNumber: 4,
    })
    const invalid = ComponentDefinition.parse({
      ...input('Custom'),
      customType: 'Queue',
      customProperty: ['owner'],
    })
    expect(valid.success && valid.data.value).toMatchObject({
      type: 'Custom',
      input: {
        customTypeName: 'Queue',
        metadata: { owner: 'orders' },
        description: 'Queue component',
        sourceLocation: { lineNumber: 10, columnNumber: 4 },
      },
    })
    expect(invalid.success).toBe(false)
  })

  it('requires a custom component type', () => {
    expect(ComponentDefinition.parse(input('Custom')).success).toBe(false)
  })

  it('omits optional values that were not supplied', () => {
    const domainOp = ComponentDefinition.parse({ ...input('DomainOp'), operationName: 'execute' })
    const event = ComponentDefinition.parse({ ...input('Event'), eventName: 'Executed' })
    const custom = ComponentDefinition.parse({ ...input('Custom'), customType: 'Queue' })
    expect(domainOp.success && domainOp.data.value).not.toHaveProperty('input.entity')
    expect(event.success && event.data.value).not.toHaveProperty('input.eventSchema')
    expect(custom.success && custom.data.value).not.toHaveProperty('input.metadata')
  })
})
