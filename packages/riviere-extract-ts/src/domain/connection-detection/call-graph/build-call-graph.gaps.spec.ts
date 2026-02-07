import {
  describe, it, expect 
} from 'vitest'
import { ComponentIndex } from '../component-index'
import { buildCallGraph } from './build-call-graph'
import {
  sharedProject, nextFile, buildComponent, defaultOptions 
} from './call-graph-fixtures'

describe('buildCallGraph — method-level source components', () => {
  it('detects connection from method-level component to injected dependency', () => {
    const file = nextFile(`
class PlaceOrderUseCase {
  execute(): void {}
}

class PlaceOrderEndpoint {
  constructor(private useCase: PlaceOrderUseCase) {}
  handle(): void {
    this.useCase.execute()
  }
}
`)
    const handleComp = buildComponent('handle', file, 8, { type: 'api' })
    const useCaseComp = buildComponent('PlaceOrderUseCase', file, 2)
    const index = new ComponentIndex([handleComp, useCaseComp])
    const result = buildCallGraph(sharedProject, [handleComp, useCaseComp], index, defaultOptions())

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:api:handle',
          target: 'orders:useCase:PlaceOrderUseCase',
          type: 'sync',
        }),
      ]),
    )
  })

  it('traces only the specific method for method-level components', () => {
    const file = nextFile(`
class TargetA {
  run(): void {}
}

class TargetB {
  run(): void {}
}

class Container {
  constructor(private a: TargetA, private b: TargetB) {}
  methodA(): void {
    this.a.run()
  }
  methodB(): void {
    this.b.run()
  }
}
`)
    const methodAComp = buildComponent('methodA', file, 12, { type: 'api' })
    const targetA = buildComponent('TargetA', file, 2, { type: 'domainOp' })
    const targetB = buildComponent('TargetB', file, 6, { type: 'domainOp' })
    const index = new ComponentIndex([methodAComp, targetA, targetB])
    const result = buildCallGraph(
      sharedProject,
      [methodAComp, targetA, targetB],
      index,
      defaultOptions(),
    )

    const methodALinks = result.filter((l) => l.source === 'orders:api:methodA')
    expect(methodALinks).toHaveLength(1)
    expect(methodALinks[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:api:methodA',
        target: 'orders:domainOp:TargetA',
      }),
    )
  })
})

describe('buildCallGraph — container-aware component lookup', () => {
  it('detects connection to method-level component via container class', () => {
    const file = nextFile(`
class Order {
  begin(): void {}
  cancel(): void {}
}

class PlaceOrderUseCase {
  execute(): void {
    const order = new Order()
    order.begin()
  }
}
`)
    const beginComp = buildComponent('begin', file, 3, { type: 'domainOp' })
    const cancelComp = buildComponent('cancel', file, 4, { type: 'domainOp' })
    const useCaseComp = buildComponent('PlaceOrderUseCase', file, 7)
    const index = new ComponentIndex([beginComp, cancelComp, useCaseComp])
    const result = buildCallGraph(
      sharedProject,
      [beginComp, cancelComp, useCaseComp],
      index,
      defaultOptions(),
    )

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:PlaceOrderUseCase',
          target: 'orders:domainOp:begin',
          type: 'sync',
        }),
      ]),
    )
  })

  it('detects connection to event publisher method via container class', () => {
    const file = nextFile(`
class OrderEventPublisher {
  publishOrderPlaced(): void {}
  publishOrderCancelled(): void {}
}

class PlaceOrderUseCase {
  constructor(private publisher: OrderEventPublisher) {}
  execute(): void {
    this.publisher.publishOrderPlaced()
  }
}
`)
    const publishComp = buildComponent('publishOrderPlaced', file, 3, { type: 'eventPublisher' })
    const cancelPubComp = buildComponent('publishOrderCancelled', file, 4, {type: 'eventPublisher',})
    const useCaseComp = buildComponent('PlaceOrderUseCase', file, 7)
    const index = new ComponentIndex([publishComp, cancelPubComp, useCaseComp])
    const result = buildCallGraph(
      sharedProject,
      [publishComp, cancelPubComp, useCaseComp],
      index,
      defaultOptions(),
    )

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:PlaceOrderUseCase',
          target: 'orders:eventPublisher:publishOrderPlaced',
          type: 'sync',
        }),
      ]),
    )
  })

  it('traces through non-component to reach container method-level component', () => {
    const file = nextFile(`
class Shipment {
  dispatch(): void {}
}

class ShipmentFactory {
  private shipment: Shipment
  constructor(shipment: Shipment) { this.shipment = shipment }
  create(): void {
    this.shipment.dispatch()
  }
}

class DispatchShipmentUseCase {
  private factory: ShipmentFactory
  constructor(factory: ShipmentFactory) { this.factory = factory }
  execute(): void {
    this.factory.create()
  }
}
`)
    const dispatchComp = buildComponent('dispatch', file, 3, { type: 'domainOp' })
    const useCaseComp = buildComponent('DispatchShipmentUseCase', file, 14)
    const index = new ComponentIndex([dispatchComp, useCaseComp])
    const result = buildCallGraph(
      sharedProject,
      [dispatchComp, useCaseComp],
      index,
      defaultOptions(),
    )

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:DispatchShipmentUseCase',
          target: 'orders:domainOp:dispatch',
        }),
      ]),
    )
  })

  it('falls through to tracing when container method is not a component', () => {
    const file = nextFile(`
class Target {
  run(): void {}
}

class NonContainerService {
  private target: Target
  constructor(target: Target) { this.target = target }
  helperNotComponent(): void {
    this.target.run()
  }
}

class Caller {
  private svc: NonContainerService
  constructor(svc: NonContainerService) { this.svc = svc }
  execute(): void {
    this.svc.helperNotComponent()
  }
}
`)
    const targetComp = buildComponent('Target', file, 2, { type: 'domainOp' })
    const callerComp = buildComponent('Caller', file, 14)
    const index = new ComponentIndex([targetComp, callerComp])
    const result = buildCallGraph(sharedProject, [targetComp, callerComp], index, defaultOptions())

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:Caller',
          target: 'orders:domainOp:Target',
        }),
      ]),
    )
  })

  it('excludes self-links when container method resolves to calling component', () => {
    const file = nextFile(`
class Ledger {
  reconcile(): void {
    this.reconcile()
  }
}
`)
    const reconcileComp = buildComponent('reconcile', file, 3, { type: 'domainOp' })
    const index = new ComponentIndex([reconcileComp])
    const result = buildCallGraph(sharedProject, [reconcileComp], index, defaultOptions())

    const selfLinks = result.filter(
      (l) => l.source === 'orders:domainOp:reconcile' && l.target === 'orders:domainOp:reconcile',
    )
    expect(selfLinks).toHaveLength(0)
  })
})

describe('buildCallGraph — component not found in any class', () => {
  it('skips component whose location matches no class or method', () => {
    const file = nextFile(`
function standalone(): void {}
`)
    const orphanComp = buildComponent('orphan', file, 99)
    const index = new ComponentIndex([orphanComp])
    const result = buildCallGraph(sharedProject, [orphanComp], index, defaultOptions())

    expect(result).toStrictEqual([])
  })
})

describe('buildCallGraph — array type unwrapping in loops', () => {
  it('resolves element type when iterating array with for-of', () => {
    const file = nextFile(`
class LineItem {
  applyDiscount(): void {}
}

class ApplyDiscountsUseCase {
  constructor(private items: LineItem[]) {}
  execute(): void {
    for (const item of this.items) {
      item.applyDiscount()
    }
  }
}
`)
    const applyDiscountComp = buildComponent('applyDiscount', file, 3, { type: 'domainOp' })
    const useCaseComp = buildComponent('ApplyDiscountsUseCase', file, 6)
    const index = new ComponentIndex([applyDiscountComp, useCaseComp])
    const result = buildCallGraph(
      sharedProject,
      [applyDiscountComp, useCaseComp],
      index,
      defaultOptions(),
    )

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:ApplyDiscountsUseCase',
          target: 'orders:domainOp:applyDiscount',
          type: 'sync',
        }),
      ]),
    )
  })
})

describe('buildCallGraph — standalone function components', () => {
  it('detects connection from standalone function to injected dependency', () => {
    const file = nextFile(`
class UpdateTrackingUseCase {
  execute(): void {}
}

export function runTrackingUpdate(useCase: UpdateTrackingUseCase): void {
  useCase.execute()
}
`)
    const funcComp = buildComponent('runTrackingUpdate', file, 6, { type: 'backgroundJob' })
    const useCaseComp = buildComponent('UpdateTrackingUseCase', file, 2)
    const index = new ComponentIndex([funcComp, useCaseComp])
    const result = buildCallGraph(sharedProject, [funcComp, useCaseComp], index, defaultOptions())

    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:backgroundJob:runTrackingUpdate',
          target: 'orders:useCase:UpdateTrackingUseCase',
          type: 'sync',
        }),
      ]),
    )
  })
})
