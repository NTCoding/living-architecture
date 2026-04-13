import {
  describe, it, expect 
} from 'vitest'
import { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { buildCallGraph } from './build-call-graph'
import type { CallGraphOptions } from './call-graph-types'
import {
  sharedProject, nextFile, buildComponent, defaultOptions 
} from './call-graph-fixtures'

function strictOptions(): CallGraphOptions {
  return {
    ...defaultOptions(),
    strict: true,
  }
}

describe('buildCallGraph', () => {
  it('returns empty links when no components provided', () => {
    const result = buildCallGraph(sharedProject, [], new ComponentIndex([]), defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('returns empty links when component has no method calls', () => {
    const file = nextFile(`
class PlaceOrder {
  execute(): void {
    const x = 1 + 2
  }
}
`)
    const comp = buildComponent('PlaceOrder', file, 2)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('returns link when component method calls another component method', () => {
    const file = nextFile(`
class OrderRepo {
  save(): void {}
}

class PlaceOrder {
  private repo: OrderRepo
  constructor(repo: OrderRepo) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`)
    const compRepo = buildComponent('OrderRepo', file, 2, { type: 'domainOp' })
    const compUC = buildComponent('PlaceOrder', file, 6)
    const index = new ComponentIndex([compRepo, compUC])
    const result = buildCallGraph(sharedProject, [compRepo, compUC], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:placeorder',
        target: 'orders:orders-module:domainOp:orderrepo',
        type: 'sync',
        sourceLocation: expect.objectContaining({
          filePath: file,
          lineNumber: 10,
          methodName: 'execute',
        }),
      }),
    ])
  })

  it('traces through single non-component to reach target component', () => {
    const file = nextFile(`
class Notifier {
  notify(): void {}
}

class EmailService {
  private notifier: Notifier
  constructor(notifier: Notifier) { this.notifier = notifier }
  send(): void {
    this.notifier.notify()
  }
}

class SendEmail {
  private svc: EmailService
  constructor(svc: EmailService) { this.svc = svc }
  execute(): void {
    this.svc.send()
  }
}
`)
    const compNotifier = buildComponent('Notifier', file, 2, { type: 'domainOp' })
    const compSendEmail = buildComponent('SendEmail', file, 14)
    const index = new ComponentIndex([compNotifier, compSendEmail])
    const result = buildCallGraph(
      sharedProject,
      [compNotifier, compSendEmail],
      index,
      defaultOptions(),
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:sendemail',
        target: 'orders:orders-module:domainOp:notifier',
        sourceLocation: expect.objectContaining({
          filePath: file,
          lineNumber: 18,
          methodName: 'execute',
        }),
      }),
    ])
  })

  it('traces through 5+ non-component hops', () => {
    const file = nextFile(`
class Target {
  run(): void {}
}

class Hop5 {
  private target: Target
  constructor(target: Target) { this.target = target }
  go(): void { this.target.run() }
}

class Hop4 {
  private hop5: Hop5
  constructor(hop5: Hop5) { this.hop5 = hop5 }
  go(): void { this.hop5.go() }
}

class Hop3 {
  private hop4: Hop4
  constructor(hop4: Hop4) { this.hop4 = hop4 }
  go(): void { this.hop4.go() }
}

class Hop2 {
  private hop3: Hop3
  constructor(hop3: Hop3) { this.hop3 = hop3 }
  go(): void { this.hop3.go() }
}

class Hop1 {
  private hop2: Hop2
  constructor(hop2: Hop2) { this.hop2 = hop2 }
  go(): void { this.hop2.go() }
}

class Origin {
  private hop1: Hop1
  constructor(hop1: Hop1) { this.hop1 = hop1 }
  execute(): void { this.hop1.go() }
}
`)
    const compTarget = buildComponent('Target', file, 2, { type: 'domainOp' })
    const compOrigin = buildComponent('Origin', file, 36)
    const index = new ComponentIndex([compTarget, compOrigin])
    const result = buildCallGraph(sharedProject, [compTarget, compOrigin], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:origin',
        target: 'orders:orders-module:domainOp:target',
      }),
    ])
  })

  it('returns no link when chain ends at dead-end non-component', () => {
    const file = nextFile(`
class Logger {
  log(): void { console.log('hi') }
}

class DoStuff {
  private logger: Logger
  constructor(logger: Logger) { this.logger = logger }
  execute(): void {
    this.logger.log()
  }
}
`)
    const comp = buildComponent('DoStuff', file, 6)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('detects cycle A then B then A and produces bidirectional links', () => {
    const file = nextFile(`
class CompB {
  private a!: CompA
  ping(): void { this.a.pong() }
}

class CompA {
  private b: CompB
  constructor(b: CompB) { this.b = b }
  pong(): void { this.b.ping() }
}
`)
    const compA = buildComponent('CompA', file, 7)
    const compB = buildComponent('CompB', file, 2, { type: 'domainOp' })
    const index = new ComponentIndex([compA, compB])
    const result = buildCallGraph(sharedProject, [compA, compB], index, defaultOptions())

    const aToB = result.find(
      (l) =>
        l.source === 'orders:orders-module:useCase:compa' &&
        l.target === 'orders:orders-module:domainOp:compb',
    )
    const bToA = result.find(
      (l) =>
        l.source === 'orders:orders-module:domainOp:compb' &&
        l.target === 'orders:orders-module:useCase:compa',
    )
    expect(aToB).toBeDefined()
    expect(bToA).toBeDefined()
    expect(result).toHaveLength(2)
  })

  it('excludes self-links when source and target are same component', () => {
    const file = nextFile(`
class SelfRef {
  helper(): void {}
  execute(): void {
    this.helper()
  }
}
`)
    const comp = buildComponent('SelfRef', file, 2)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('resolves interface-typed constructor param to implementing class when single implementation', () => {
    const file = nextFile(`
interface IOrderRepo {
  save(): void
}

class OrderRepo implements IOrderRepo {
  save(): void {}
}

class PlaceOrder {
  private repo: IOrderRepo
  constructor(repo: IOrderRepo) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`)
    const compRepo = buildComponent('OrderRepo', file, 6, { type: 'repository' })
    const compUC = buildComponent('PlaceOrder', file, 10)
    const index = new ComponentIndex([compRepo, compUC])
    const result = buildCallGraph(sharedProject, [compRepo, compUC], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:placeorder',
        target: 'orders:orders-module:repository:orderrepo',
        type: 'sync',
      }),
    ])
  })

  it('resolves abstract class typed param to extending class when single implementation', () => {
    const file = nextFile(`
abstract class AbstractNotifier {
  abstract notify(): void
}

class EmailNotifier extends AbstractNotifier {
  notify(): void {}
}

class SendNotification {
  private notifier: AbstractNotifier
  constructor(notifier: AbstractNotifier) { this.notifier = notifier }
  execute(): void {
    this.notifier.notify()
  }
}
`)
    const compNotifier = buildComponent('EmailNotifier', file, 6, { type: 'domainOp' })
    const compUC = buildComponent('SendNotification', file, 10)
    const index = new ComponentIndex([compNotifier, compUC])
    const result = buildCallGraph(sharedProject, [compNotifier, compUC], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:sendnotification',
        target: 'orders:orders-module:domainOp:emailnotifier',
      }),
    ])
  })

  it('produces _uncertain link when receiver type is unresolvable in lenient mode', () => {
    const file = nextFile(`
class UncertainCaller {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.doSomething()
  }
}
`)
    const comp = buildComponent('UncertainCaller', file, 2)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:uncertaincaller',
        target: '_unresolved',
        _uncertain: expect.stringContaining('any'),
      }),
    ])
  })

  it('throws ConnectionDetectionError when receiver type is unresolvable in strict mode', () => {
    const file = nextFile(`
class StrictUncertainCaller {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.doSomething()
  }
}
`)
    const comp = buildComponent('StrictUncertainCaller', file, 2)
    const index = new ComponentIndex([comp])

    expect(() => buildCallGraph(sharedProject, [comp], index, strictOptions())).toThrow(
      ConnectionDetectionError,
    )
  })

  it('resolves interface through non-component tracing to reach target component', () => {
    const file = nextFile(`
interface IEventStore {
  append(): void
}

class EventStore implements IEventStore {
  append(): void {}
}

class EventBus {
  private store: IEventStore
  constructor(store: IEventStore) { this.store = store }
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
`)
    const store = buildComponent('EventStore', file, 6, { type: 'repository' })
    const useCase = buildComponent('PublishEvent', file, 18)
    const index = new ComponentIndex([store, useCase])
    const result = buildCallGraph(sharedProject, [store, useCase], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:publishevent',
        target: 'orders:orders-module:repository:eventstore',
      }),
    ])
  })

  it('emits uncertain link when interface defined in source has no implementation and no class found', () => {
    const file = nextFile(`
interface AlertChannel {
  send(): void
}

class AlertUser {
  private channel: AlertChannel
  constructor(channel: AlertChannel) { this.channel = channel }
  execute(): void {
    this.channel.send()
  }
}
`)
    const comp = buildComponent('AlertUser', file, 6)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:alertuser',
        target: '_unresolved',
        _uncertain: expect.stringContaining('No implementation found for AlertChannel'),
      }),
    ])
  })
})
