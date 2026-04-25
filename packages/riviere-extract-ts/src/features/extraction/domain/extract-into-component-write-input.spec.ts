import {
  toComponentWriteInput,
  toExtractionComponentId,
} from './extract-into-component-write-input'
import type { EnrichedComponent } from './value-extraction/enrich-components'

type MetadataValue = string | number | boolean | string[]

function createComponent(
  overrides: Partial<{
    type: string
    metadata: Record<string, MetadataValue>
  }> = {},
): EnrichedComponent {
  return {
    type: overrides.type ?? 'useCase',
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'checkout',
    location: {
      file: '/workspace/orders/place-order.ts',
      line: 7,
    },
    metadata: overrides.metadata ?? {},
  }
}

describe('toExtractionComponentId', () => {
  it('uses builder-compatible type segments for generated component ids', () => {
    expect(toExtractionComponentId(createComponent())).toBe('orders:checkout:usecase:placeorder')
    expect(toExtractionComponentId(createComponent({ type: 'domainOp' }))).toBe(
      'orders:checkout:domainop:placeorder',
    )
    expect(toExtractionComponentId(createComponent({ type: 'eventHandler' }))).toBe(
      'orders:checkout:eventhandler:placeorder',
    )
  })

  it('keeps non-special component types unchanged in generated ids', () => {
    expect(toExtractionComponentId(createComponent({ type: 'backgroundJob' }))).toBe(
      'orders:checkout:backgroundJob:placeorder',
    )
  })
})

describe('toComponentWriteInput', () => {
  it('maps use cases into write inputs', () => {
    expect(toComponentWriteInput(createComponent(), 'test/repo')).toStrictEqual({
      type: 'useCase',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })
  })

  it('maps domain operations when operation metadata exists', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'domainOp',
          metadata: { operationName: 'placeOrder' },
        }),
        'test/repo',
      ),
    ).toStrictEqual({
      type: 'domainOp',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })
  })

  it('rejects whitespace-only required metadata fields', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'domainOp',
          metadata: { operationName: '   ' },
        }),
        'test/repo',
      ),
    ).toBeUndefined()

    expect(
      toComponentWriteInput(
        createComponent({
          type: 'ui',
          metadata: { route: '   ' },
        }),
        'test/repo',
      ),
    ).toBeUndefined()

    expect(
      toComponentWriteInput(
        createComponent({
          type: 'event',
          metadata: { eventName: '   ' },
        }),
        'test/repo',
      ),
    ).toBeUndefined()
  })

  it('returns undefined for domain operations missing operation metadata', () => {
    expect(
      toComponentWriteInput(createComponent({ type: 'domainOp' }), 'test/repo'),
    ).toBeUndefined()
  })

  it('maps apis with optional path, operation, and http method metadata', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'api',
          metadata: {
            apiType: 'REST',
            path: '/orders',
            operationName: 'createOrder',
            httpMethod: 'POST',
          },
        }),
        'test/repo',
      ),
    ).toStrictEqual({
      type: 'api',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      path: '/orders',
      operationName: 'createOrder',
      httpMethod: 'POST',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })
  })

  it('returns undefined for apis with invalid api type metadata', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'api',
          metadata: { apiType: 'SOAP' },
        }),
        'test/repo',
      ),
    ).toBeUndefined()
  })

  it('maps ui, event, and event handler components when required metadata exists', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'ui',
          metadata: { route: '/checkout' },
        }),
        'test/repo',
      ),
    ).toMatchObject({
      type: 'ui',
      route: '/checkout',
    })

    expect(
      toComponentWriteInput(
        createComponent({
          type: 'event',
          metadata: {
            eventName: 'OrderPlaced',
            eventSchema: 'OrderPlacedV1',
          },
        }),
        'test/repo',
      ),
    ).toMatchObject({
      type: 'event',
      eventName: 'OrderPlaced',
      eventSchema: 'OrderPlacedV1',
    })

    expect(
      toComponentWriteInput(
        createComponent({
          type: 'eventHandler',
          metadata: { subscribedEvents: [' OrderPlaced '] },
        }),
        'test/repo',
      ),
    ).toMatchObject({
      type: 'eventHandler',
      subscribedEvents: ['OrderPlaced'],
    })
  })

  it('returns undefined when ui, event, or event handler metadata is invalid', () => {
    const invalidEventHandler = createComponent({ type: 'eventHandler' })
    Reflect.set(invalidEventHandler.metadata, 'subscribedEvents', ['OrderPlaced', 1])

    expect(toComponentWriteInput(createComponent({ type: 'ui' }), 'test/repo')).toBeUndefined()
    expect(toComponentWriteInput(createComponent({ type: 'event' }), 'test/repo')).toBeUndefined()
    expect(toComponentWriteInput(invalidEventHandler, 'test/repo')).toBeUndefined()
  })

  it('accepts every supported http method and rejects non-array subscribed events', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'eventHandler',
          metadata: { subscribedEvents: 'OrderPlaced' },
        }),
        'test/repo',
      ),
    ).toBeUndefined()

    const methods = ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
    for (const httpMethod of methods) {
      expect(
        toComponentWriteInput(
          createComponent({
            type: 'api',
            metadata: {
              apiType: 'REST',
              httpMethod,
            },
          }),
          'test/repo',
        ),
      ).toMatchObject({
        type: 'api',
        httpMethod,
      })
    }
  })

  it('rejects whitespace-only event schema and subscribed event members', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'event',
          metadata: {
            eventName: 'OrderPlaced',
            eventSchema: '   ',
          },
        }),
        'test/repo',
      ),
    ).toStrictEqual({
      type: 'event',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      eventName: 'OrderPlaced',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })

    expect(
      toComponentWriteInput(
        createComponent({
          type: 'eventHandler',
          metadata: { subscribedEvents: ['OrderPlaced', '   '] },
        }),
        'test/repo',
      ),
    ).toBeUndefined()
  })

  it('omits unsupported http methods instead of failing api conversion', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'api',
          metadata: {
            apiType: 'REST',
            httpMethod: 'TRACE',
          },
        }),
        'test/repo',
      ),
    ).toStrictEqual({
      type: 'api',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })
  })

  it('maps custom components with metadata intact', () => {
    expect(
      toComponentWriteInput(
        createComponent({
          type: 'backgroundJob',
          metadata: { queue: 'orders' },
        }),
        'test/repo',
      ),
    ).toStrictEqual({
      type: 'custom',
      customTypeName: 'backgroundJob',
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'checkout',
      metadata: { queue: 'orders' },
      sourceLocation: {
        repository: 'test/repo',
        filePath: '/workspace/orders/place-order.ts',
        lineNumber: 7,
      },
    })
  })
})
