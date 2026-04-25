import {
  toOutcomeComponentId,
  toPresentedComponent,
  toPresentedLink,
} from './extraction-project-presentation'
import type { EnrichedComponent } from '@living-architecture/riviere-extract-ts'
import type {
  Component, Link 
} from '@living-architecture/riviere-schema'

function createBaseComponent(type: Component['type']): Component {
  const sourceLocation = {
    repository: 'test/repo',
    filePath: '/workspace/orders/source.ts',
    lineNumber: 7,
  }

  if (type === 'UI') {
    return {
      id: 'orders:checkout:ui:checkoutpage',
      type,
      name: 'CheckoutPage',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout',
      sourceLocation,
    }
  }
  if (type === 'API') {
    return {
      id: 'orders:checkout:api:createorder',
      type,
      name: 'CreateOrder',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      path: '/orders',
      httpMethod: 'POST',
      operationName: 'createOrder',
      sourceLocation,
    }
  }
  if (type === 'UseCase') {
    return {
      id: 'orders:checkout:usecase:placeorder',
      type,
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      sourceLocation,
    }
  }
  if (type === 'DomainOp') {
    return {
      id: 'orders:checkout:domainop:placeorder',
      type,
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      entity: 'Order',
      businessRules: ['must validate'],
      sourceLocation,
    }
  }
  if (type === 'Event') {
    return {
      id: 'orders:checkout:event:orderplaced',
      type,
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'checkout',
      eventName: 'OrderPlaced',
      eventSchema: 'OrderPlacedV1',
      sourceLocation,
    }
  }
  if (type === 'EventHandler') {
    return {
      id: 'orders:checkout:eventhandler:notifyorderplaced',
      type,
      name: 'NotifyOrderPlaced',
      domain: 'orders',
      module: 'checkout',
      subscribedEvents: ['OrderPlaced'],
      sourceLocation,
    }
  }

  return {
    id: 'orders:checkout:custom:publishorderevent',
    type,
    name: 'PublishOrderEvent',
    domain: 'orders',
    module: 'checkout',
    customTypeName: 'backgroundJob',
    queue: 'orders',
    retries: 3,
    enabled: true,
    tags: ['critical'],
    nested: { ignored: true },
    description: 'ignored',
    sourceLocation,
  }
}

describe('extraction project presentation helpers', () => {
  it('preserves original metadata and missing fields when provided', () => {
    const component = createBaseComponent('UseCase')
    const original: EnrichedComponent = {
      type: 'useCase',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      location: {
        file: '/workspace/orders/original.ts',
        line: 11,
      },
      metadata: { original: 'kept' },
    }

    expect(
      toPresentedComponent(
        component,
        [
          {
            componentId: component.id,
            field: 'operationName',
          },
        ],
        new Map([[component.id, original]]),
      ),
    ).toStrictEqual({
      ...original,
      location: {
        file: '/workspace/orders/source.ts',
        line: 7,
      },
      _missing: ['operationName'],
    })
  })

  it('falls back to line 1 and empty metadata for use cases without original metadata', () => {
    const component = {
      ...createBaseComponent('UseCase'),
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/source.ts',
      },
    }

    expect(toPresentedComponent(component, [], new Map())).toMatchObject({
      location: {
        file: '/workspace/orders/source.ts',
        line: 1,
      },
      metadata: {},
    })
  })

  it('maps ui and api components into enriched presentation metadata', () => {
    expect(toPresentedComponent(createBaseComponent('UI'), [], new Map()).metadata).toStrictEqual({route: '/checkout',})
    expect(toPresentedComponent(createBaseComponent('API'), [], new Map()).metadata).toStrictEqual({
      apiType: 'REST',
      path: '/orders',
      httpMethod: 'POST',
      operationName: 'createOrder',
    })
    expect(
      toPresentedComponent(createBaseComponent('UseCase'), [], new Map()).metadata,
    ).toStrictEqual({})
  })

  it('maps domain, event, and event-handler components into enriched presentation metadata', () => {
    expect(
      toPresentedComponent(createBaseComponent('DomainOp'), [], new Map()).metadata,
    ).toStrictEqual({
      operationName: 'placeOrder',
      entity: 'Order',
      businessRules: ['must validate'],
    })
    expect(
      toPresentedComponent(createBaseComponent('Event'), [], new Map()).metadata,
    ).toStrictEqual({
      eventName: 'OrderPlaced',
      eventSchema: 'OrderPlacedV1',
    })
    expect(
      toPresentedComponent(createBaseComponent('EventHandler'), [], new Map()).metadata,
    ).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
  })

  it('omits optional api, domain-op, and event metadata when those fields are absent', () => {
    expect(
      toPresentedComponent(
        {
          ...createBaseComponent('API'),
          httpMethod: undefined,
          path: undefined,
          operationName: undefined,
        },
        [],
        new Map(),
      ).metadata,
    ).toStrictEqual({ apiType: 'REST' })

    expect(
      toPresentedComponent(
        {
          ...createBaseComponent('DomainOp'),
          entity: undefined,
          businessRules: undefined,
        },
        [],
        new Map(),
      ).metadata,
    ).toStrictEqual({ operationName: 'placeOrder' })

    expect(
      toPresentedComponent(
        {
          ...createBaseComponent('Event'),
          eventSchema: undefined,
        },
        [],
        new Map(),
      ).metadata,
    ).toStrictEqual({ eventName: 'OrderPlaced' })
  })

  it('maps custom components while filtering excluded and unsupported metadata', () => {
    expect(
      toPresentedComponent(createBaseComponent('Custom'), [], new Map()).metadata,
    ).toStrictEqual({
      queue: 'orders',
      retries: 3,
      enabled: true,
      tags: ['critical'],
    })
  })

  it('maps links with and without uncertain diagnostics', () => {
    const certainLink: Link = {
      source: 'a',
      target: 'b',
      type: 'async',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/source.ts',
        lineNumber: 3,
      },
    }
    const uncertainLink: Link = {
      source: 'c',
      target: 'd',
    }

    expect(toPresentedLink(certainLink, [])).toStrictEqual(certainLink)
    expect(
      toPresentedLink(uncertainLink, [
        {
          source: 'c',
          target: 'd',
          linkType: 'sync',
          reason: 'receiver unresolved',
        },
      ]),
    ).toStrictEqual({
      source: 'c',
      target: 'd',
      _uncertain: 'receiver unresolved',
    })
  })

  it('builds canonical outcome component ids for use-case and domain-op components', () => {
    expect(
      toOutcomeComponentId({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'checkout',
        location: {
          file: '/workspace/orders/source.ts',
          line: 1,
        },
        metadata: {},
      }),
    ).toBe('orders:checkout:usecase:placeorder')
    expect(
      toOutcomeComponentId({
        type: 'domainOp',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'checkout',
        location: {
          file: '/workspace/orders/source.ts',
          line: 1,
        },
        metadata: {},
      }),
    ).toBe('orders:checkout:domainop:placeorder')
  })

  it('builds canonical outcome component ids for event-handler and custom components', () => {
    expect(
      toOutcomeComponentId({
        type: 'eventHandler',
        name: 'NotifyOrderPlaced',
        domain: 'orders',
        module: 'checkout',
        location: {
          file: '/workspace/orders/source.ts',
          line: 1,
        },
        metadata: {},
      }),
    ).toBe('orders:checkout:eventhandler:notifyorderplaced')
    expect(
      toOutcomeComponentId({
        type: 'backgroundJob',
        name: 'PublishOrderEvent',
        domain: 'orders',
        module: 'checkout',
        location: {
          file: '/workspace/orders/source.ts',
          line: 1,
        },
        metadata: {},
      }),
    ).toBe('orders:checkout:backgroundJob:publishorderevent')
  })
})
