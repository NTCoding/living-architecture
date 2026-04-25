import {
  describe, expect, it, vi 
} from 'vitest'
import {
  DuplicateComponentError, RiviereBuilder 
} from '@living-architecture/riviere-builder'
import {
  mergeWritePort,
  SameStepDuplicateComponentError,
  strictWritePort,
  toCanonicalComponentId,
  type WorkflowBuilder,
  type WorkflowDiagnostics,
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

function createWorkflowBuilder(): WorkflowBuilder {
  return {
    upsertUI: vi.fn().mockReturnValue({ created: true }),
    upsertApi: vi.fn().mockReturnValue({ created: true }),
    upsertUseCase: vi.fn().mockReturnValue({ created: true }),
    upsertDomainOp: vi.fn().mockReturnValue({ created: true }),
    upsertEvent: vi.fn().mockReturnValue({ created: true }),
    upsertEventHandler: vi.fn().mockReturnValue({ created: true }),
    upsertCustom: vi.fn().mockReturnValue({ created: true }),
    link: vi.fn(),
    linkExternal: vi.fn(),
    defineCustomType: vi.fn(),
  }
}

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

describe('mergeWritePort', () => {
  it('throws same-step duplicate errors with duplicate id and step context', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })
    const component = createUseCaseInput()

    writePort.addComponent(component)

    expect(() => writePort.addComponent(component)).toThrowError(
      new SameStepDuplicateComponentError(
        toCanonicalComponentId(component),
        'extract-orders',
        'code-extraction',
      ),
    )
  })

  it('routes diagnostics into the workflow diagnostic sink', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

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

    expect(diagnostics.report).toHaveBeenNthCalledWith(1, {
      kind: 'missing-field',
      componentId: 'orders:checkout:usecase:placeorder',
      field: 'operationName',
      reason: 'operation name missing',
    })
    expect(diagnostics.report).toHaveBeenNthCalledWith(2, {
      kind: 'uncertain-link',
      source: 'orders:checkout:usecase:placeorder',
      target: 'orders:checkout:event:orderplaced',
      linkType: 'async',
      reason: 'receiver type unresolved',
    })
  })

  it('routes workflow component writes through upsert operations', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addComponent(createUseCaseInput())
    writePort.addComponent(createCustomInput())

    expect(workflowBuilder.upsertUseCase).toHaveBeenCalledWith(createUseCaseInput())
    expect(workflowBuilder.defineCustomType).toHaveBeenCalledWith({ name: 'backgroundJob' })
    expect(workflowBuilder.upsertCustom).toHaveBeenCalledWith(createCustomInput())
  })

  it('defines a custom type only once per write port even across multiple custom writes', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addComponent(createCustomInput())
    writePort.addComponent({
      ...createCustomInput(),
      name: 'RepublishOrderEvent',
    })

    expect(workflowBuilder.defineCustomType).toHaveBeenCalledTimes(1)
  })

  it('swallows normal errors from custom type definition and continues writing', () => {
    const workflowBuilder = createWorkflowBuilder()
    vi.spyOn(workflowBuilder, 'defineCustomType').mockImplementation(() => {
      throw new SameStepDuplicateComponentError(
        'orders:checkout:custom:backgroundjob',
        'step',
        'type',
      )
    })
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addComponent(createCustomInput())

    expect(workflowBuilder.upsertCustom).toHaveBeenCalledWith(createCustomInput())
  })

  it('rethrows non-error custom type failures', () => {
    const workflowBuilder = createWorkflowBuilder()
    vi.spyOn(workflowBuilder, 'defineCustomType').mockImplementation(() => {
      throw 'boom'
    })
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    expect(() => writePort.addComponent(createCustomInput())).toThrow('boom')
  })

  it('routes workflow link writes through linking operations', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addLink({
      from: 'a',
      to: 'b',
      type: 'sync',
    })
    writePort.addExternalLink({
      from: 'a',
      target: { name: 'External Orders API' },
      type: 'sync',
    })

    expect(workflowBuilder.link).toHaveBeenCalledWith({
      from: 'a',
      to: 'b',
      type: 'sync',
    })
    expect(workflowBuilder.linkExternal).toHaveBeenCalledWith({
      from: 'a',
      target: { name: 'External Orders API' },
      type: 'sync',
    })
  })

  it('routes ui, api, and use case components through workflow upsert methods', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addComponent(createUiInput())
    writePort.addComponent(createApiInput())
    writePort.addComponent(createUseCaseInput())

    expect(workflowBuilder.upsertUI).toHaveBeenCalledWith(createUiInput())
    expect(workflowBuilder.upsertApi).toHaveBeenCalledWith(createApiInput())
    expect(workflowBuilder.upsertUseCase).toHaveBeenCalledWith(createUseCaseInput())
  })

  it('routes domain, event, and event-handler components through workflow upsert methods', () => {
    const workflowBuilder = createWorkflowBuilder()
    const diagnostics: WorkflowDiagnostics = { report: vi.fn() }
    const writePort = mergeWritePort(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })

    writePort.addComponent(createDomainOpInput())
    writePort.addComponent(createEventInput())
    writePort.addComponent(createEventHandlerInput())

    expect(workflowBuilder.upsertDomainOp).toHaveBeenCalledWith(createDomainOpInput())
    expect(workflowBuilder.upsertEvent).toHaveBeenCalledWith(createEventInput())
    expect(workflowBuilder.upsertEventHandler).toHaveBeenCalledWith(createEventHandlerInput())
  })
})
