import { describe, expect, it } from 'vitest'
import { buildComponent } from './call-graph/__fixtures__/call-graph-fixtures'
import { ConnectionDetectionError } from './connection-detection-error'
import { ConnectionDetectionOptions } from './connection-detection-values'
import { detectConnections } from './detect-connections'
import { createProject } from './__fixtures__/detect-connections-fixtures'

function createOptions(params: {
  allowIncomplete?: boolean
  sourceFilePaths: string[]
  eventPublishers?: {
    fromType: string
    metadataKey: string
  }[]
}): ConnectionDetectionOptions {
  return ConnectionDetectionOptions.parse({
    repository: 'test-repo',
    sourceFilePaths: params.sourceFilePaths,
    ...(params.allowIncomplete !== undefined && { allowIncomplete: params.allowIncomplete }),
    ...(params.eventPublishers !== undefined && { eventPublishers: params.eventPublishers }),
  })
}

describe('detectConnections', () => {
  it('returns empty links for empty components array', () => {
    const project = createProject()
    project.createSourceFile('/src/empty.ts', '')

    const result = detectConnections(
      project,
      [],
      createOptions({ sourceFilePaths: ['/src/empty.ts'] }),
    )

    expect(result.links).toMatchObject([])
  })

  it('returns non-negative timing values for all phases', () => {
    const project = createProject()
    project.createSourceFile('/src/timing.ts', '')

    const result = detectConnections(
      project,
      [],
      createOptions({ sourceFilePaths: ['/src/timing.ts'] }),
    )

    expect(result.timings.callGraphMs).toBeGreaterThanOrEqual(0)
    expect(result.timings.asyncDetectionMs).toBeGreaterThanOrEqual(0)
    expect(result.timings.setupMs).toBeGreaterThanOrEqual(0)
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0)
  })

  it('returns sync link for UseCase to Repository direct call', () => {
    const project = createProject()
    const filePath = '/src/place-order.ts'
    project.createSourceFile(
      filePath,
      `
class OrderRepository {
  save(): void {}
}

class PlaceOrder {
  private repo: OrderRepository
  constructor(repo: OrderRepository) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`,
    )
    const repo = buildComponent('OrderRepository', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PlaceOrder', filePath, 6)

    const result = detectConnections(
      project,
      [repo, useCase],
      createOptions({ sourceFilePaths: [filePath] }),
    )

    expect(result.links).toMatchObject([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:placeorder',
        target: 'orders:orders-module:repository:orderrepository',
        type: 'sync',
      }),
    ])
  })

  it('returns transitive link through non-component intermediary', () => {
    const project = createProject()
    const filePath = '/src/transitive.ts'
    project.createSourceFile(
      filePath,
      `
class EventStore {
  append(): void {}
}

class EventBus {
  private store: EventStore
  constructor(store: EventStore) { this.store = store }
  publish(): void {
    this.store.append()
  }
}

class PublishEvent {
  private bus: EventBus
  constructor(bus: EventBus) { this.bus = bus }
  execute(): void {
    this.bus.publish()
  }
}
`,
    )
    const store = buildComponent('EventStore', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PublishEvent', filePath, 14)

    const result = detectConnections(
      project,
      [store, useCase],
      createOptions({ sourceFilePaths: [filePath] }),
    )

    expect(result.links).toMatchObject([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:publishevent',
        target: 'orders:orders-module:repository:eventstore',
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when receiver type is unresolvable', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/strict.ts',
      `
class StrictComp {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.doSomething()
  }
}
`,
    )
    const comp = buildComponent('StrictComp', '/src/strict.ts', 2)

    expect(() =>
      detectConnections(project, [comp], createOptions({ sourceFilePaths: ['/src/strict.ts'] })),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns _uncertain link in lenient mode when receiver type is unresolvable', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/lenient.ts',
      `
class LenientComp {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.doSomething()
  }
}
`,
    )
    const comp = buildComponent('LenientComp', '/src/lenient.ts', 2)

    const result = detectConnections(
      project,
      [comp],
      createOptions({
        allowIncomplete: true,
        sourceFilePaths: ['/src/lenient.ts'],
      }),
    )

    expect(result.links).toMatchObject([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:lenientcomp',
        target: '_unresolved',
        _uncertain: expect.stringContaining('any'),
      }),
    ])
  })

  it('handles circular dependencies without infinite loop', () => {
    const project = createProject()
    const filePath = '/src/circular.ts'
    project.createSourceFile(
      filePath,
      `
class ServiceB {
  private a!: ServiceA
  ping(): void { this.a.pong() }
}

class ServiceA {
  private b: ServiceB
  constructor(b: ServiceB) { this.b = b }
  pong(): void { this.b.ping() }
}
`,
    )
    const compA = buildComponent('ServiceA', filePath, 7)
    const compB = buildComponent('ServiceB', filePath, 2, { type: 'domainOp' })

    const result = detectConnections(
      project,
      [compA, compB],
      createOptions({ sourceFilePaths: [filePath] }),
    )

    const aToB = result.links.find(
      (l) =>
        l.source === 'orders:orders-module:useCase:servicea' &&
        l.target === 'orders:orders-module:domainOp:serviceb',
    )
    const bToA = result.links.find(
      (l) =>
        l.source === 'orders:orders-module:domainOp:serviceb' &&
        l.target === 'orders:orders-module:useCase:servicea',
    )
    expect(aToB).toBeDefined()
    expect(bToA).toBeDefined()
    expect(result.links).toHaveLength(2)
  })

  it('returns async links from publisher to event and event to handler', () => {
    const project = createProject()
    const filePath = '/src/async-chain.ts'
    project.createSourceFile(
      filePath,
      `
class OrderPlacedEvent {}

class OrderPublisher {
  publish(event: OrderPlacedEvent): void {}
}
`,
    )
    const event = buildComponent('OrderPlacedEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const publisher = buildComponent('OrderPublisher', filePath, 4, {
      type: 'eventSender',
      metadata: { publishedEventType: 'OrderPlacedEvent' },
    })
    const handler = buildComponent('OrderPlacedHandler', '/src/handler.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlacedEvent'] },
    })

    const result = detectConnections(
      project,
      [event, publisher, handler],
      createOptions({
        sourceFilePaths: [filePath, '/src/handler.ts'],
        eventPublishers: [
          {
            fromType: 'eventSender',
            metadataKey: 'publishedEventType',
          },
        ],
      }),
    )

    expect(result.links).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:orders-module:eventSender:orderpublisher',
          target: 'orders:orders-module:event:orderplacedevent',
          type: 'async',
        }),
        expect.objectContaining({
          source: 'orders:orders-module:event:orderplacedevent',
          target: 'orders:orders-module:eventHandler:orderplacedhandler',
          type: 'async',
        }),
      ]),
    )
    expect(result.links).toHaveLength(2)
  })

  it('filters source files by sourceFilePaths', () => {
    const project = createProject()
    const includedFile = '/src/modules/ordering/handler.ts'
    const excludedFile = '/src/modules/billing/helper.ts'

    project.createSourceFile(
      includedFile,
      `
class PaymentGateway {
  charge(): void {}
}

class ProcessPayment {
  private gateway: PaymentGateway
  constructor(gateway: PaymentGateway) { this.gateway = gateway }
  execute(): void {
    this.gateway.charge()
  }
}
`,
    )
    project.createSourceFile(
      excludedFile,
      `
class BillingHelper {
  private gateway: PaymentGateway
  constructor(gateway: PaymentGateway) { this.gateway = gateway }
  assist(): void {
    this.gateway.charge()
  }
}

class PaymentGateway {
  charge(): void {}
}
`,
    )

    const gateway = buildComponent('PaymentGateway', includedFile, 2, { type: 'repository' })
    const processPayment = buildComponent('ProcessPayment', includedFile, 6)

    const result = detectConnections(
      project,
      [gateway, processPayment],
      createOptions({ sourceFilePaths: [includedFile] }),
    )

    expect(result.links).toMatchObject([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:processpayment',
        target: 'orders:orders-module:repository:paymentgateway',
      }),
    ])
    expect(project.getSourceFiles().map((f) => f.getFilePath())).toMatchObject([
      includedFile,
      excludedFile,
    ])
  })
})
