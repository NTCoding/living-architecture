import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import {
  DuplicateComponentError, RiviereBuilder 
} from '@living-architecture/riviere-builder'
import {
  strictWritePort, toCanonicalComponentId 
} from './extraction-write-port'

function createBuilder() {
  return RiviereBuilder.new({
    sources: [{ repository: 'test/repo' }],
    domains: {
      orders: {
        description: 'Orders domain',
        systemType: 'domain',
      },
    },
  })
}

function createUseCaseInput() {
  return {
    type: 'useCase' as const,
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'checkout',
    sourceLocation: {
      repository: 'test/repo',
      filePath: '/workspace/orders/place-order.ts',
      lineNumber: 3,
    },
  }
}

function createCustomInput() {
  return {
    type: 'custom' as const,
    customTypeName: 'backgroundJob',
    name: 'PublishOrderEvent',
    domain: 'orders',
    module: 'checkout',
    metadata: { queue: 'orders' },
    sourceLocation: {
      repository: 'test/repo',
      filePath: '/workspace/orders/place-order.ts',
      lineNumber: 3,
    },
  }
}

function createUiInput() {
  return {
    type: 'ui' as const,
    name: 'CheckoutPage',
    domain: 'orders',
    module: 'checkout',
    route: '/checkout',
    sourceLocation: createUseCaseInput().sourceLocation,
  }
}

function createApiInput() {
  return {
    type: 'api' as const,
    name: 'CreateOrder',
    domain: 'orders',
    module: 'checkout',
    apiType: 'REST' as const,
    sourceLocation: createUseCaseInput().sourceLocation,
  }
}

function createDomainOpInput() {
  return {
    type: 'domainOp' as const,
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'checkout',
    operationName: 'placeOrder',
    sourceLocation: createUseCaseInput().sourceLocation,
  }
}

function createEventInput() {
  return {
    type: 'event' as const,
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'checkout',
    eventName: 'OrderPlaced',
    sourceLocation: createUseCaseInput().sourceLocation,
  }
}

function createEventHandlerInput() {
  return {
    type: 'eventHandler' as const,
    name: 'NotifyOrderPlaced',
    domain: 'orders',
    module: 'checkout',
    subscribedEvents: ['OrderPlaced'],
    sourceLocation: createUseCaseInput().sourceLocation,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('strictWritePort', () => {
  it('preserves duplicate-component failures from the builder', () => {
    const writePort = strictWritePort(createBuilder())
    const component = createUseCaseInput()

    writePort.addComponent(component)

    expect(() => writePort.addComponent(component)).toThrow(DuplicateComponentError)
  })

  it('buffers missing-field and uncertain-link diagnostics for CLI presentation', () => {
    const writePort = strictWritePort(createBuilder())

    writePort.reportMissingField({
      componentId: 'orders:checkout:usecase:placeorder',
      field: 'operationName',
      reason: 'operation name missing',
    })
    writePort.reportUncertainLink({
      source: 'orders:checkout:usecase:placeorder',
      target: 'orders:checkout:event:orderplaced',
      linkType: 'async',
      reason: 'receiver type unresolved',
    })

    expect(writePort.missingFields()).toStrictEqual([
      {
        componentId: 'orders:checkout:usecase:placeorder',
        field: 'operationName',
        reason: 'operation name missing',
      },
    ])
    expect(writePort.uncertainLinks()).toStrictEqual([
      {
        source: 'orders:checkout:usecase:placeorder',
        target: 'orders:checkout:event:orderplaced',
        linkType: 'async',
        reason: 'receiver type unresolved',
      },
    ])
  })

  it('routes links, external links, and custom components through builder operations', () => {
    const builder = createBuilder()
    const writePort = strictWritePort(builder)
    const sourceComponent = createUseCaseInput()
    const targetComponent = {
      ...createUseCaseInput(),
      name: 'ReserveInventory',
      module: 'inventory',
    }

    writePort.addComponent(sourceComponent)
    writePort.addComponent(targetComponent)
    writePort.addComponent(createCustomInput())
    writePort.addLink({
      from: toCanonicalComponentId(sourceComponent),
      to: toCanonicalComponentId(targetComponent),
      type: 'sync',
    })
    writePort.addExternalLink({
      from: toCanonicalComponentId(sourceComponent),
      target: { name: 'External Orders API' },
      type: 'sync',
    })

    const graph = builder.build()
    expect(graph.metadata.customTypes).toStrictEqual({ backgroundJob: {} })
    expect(graph.components).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'Custom',
          customTypeName: 'backgroundJob',
          queue: 'orders',
        }),
      ]),
    )
    expect(graph.links).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: toCanonicalComponentId(sourceComponent),
          target: toCanonicalComponentId(targetComponent),
          type: 'sync',
        }),
      ]),
    )
    expect(graph.externalLinks).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: toCanonicalComponentId(sourceComponent),
          target: { name: 'External Orders API' },
        }),
      ]),
    )
  })

  it('routes every supported component type through strict builder add methods', () => {
    const builder = createBuilder()
    const writePort = strictWritePort(builder)

    writePort.addComponent(createUiInput())
    writePort.addComponent(createApiInput())
    writePort.addComponent(createUseCaseInput())
    writePort.addComponent(createDomainOpInput())
    writePort.addComponent(createEventInput())
    writePort.addComponent(createEventHandlerInput())

    expect(builder.stats()).toStrictEqual({
      componentCount: 6,
      componentsByType: {
        UI: 1,
        API: 1,
        UseCase: 1,
        DomainOp: 1,
        Event: 1,
        EventHandler: 1,
        Custom: 0,
      },
      linkCount: 0,
      externalLinkCount: 0,
      domainCount: 1,
    })
  })
})
