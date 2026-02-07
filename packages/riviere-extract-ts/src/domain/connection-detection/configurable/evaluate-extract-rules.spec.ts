import {
  describe, it, expect 
} from 'vitest'
import type { ConnectionExtractBlock } from '@living-architecture/riviere-extract-config'
import { evaluateExtractRules } from './evaluate-extract-rules'
import {
  createTestProject, createTestFile, getFirstCallExpression 
} from './configurable-fixtures'

const project = createTestProject()

function createFile(content: string): string {
  return createTestFile(project, content)
}

function getCallExpression(filePath: string, className: string, methodName: string) {
  return getFirstCallExpression(project, filePath, className, methodName)
}

describe('evaluateExtractRules', () => {
  it('extracts receiver type name with fromReceiverType rule', () => {
    const filePath = createFile(`
class EventBus {
  publish(): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish()
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { targetType: { fromReceiverType: true } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ targetType: 'EventBus' })
  })

  it('returns undefined for fromReceiverType when call has no property access receiver', () => {
    const filePath = createFile(`
function freeFunction(): void {}
class OrderService {
  execute(): void {
    freeFunction()
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { targetType: { fromReceiverType: true } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ targetType: undefined })
  })

  it('extracts caller class name with fromCallerType rule', () => {
    const filePath = createFile(`
class EventBus {
  publish(): void {}
}
class PlaceOrder {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish()
  }
}
`)
    const callExpr = getCallExpression(filePath, 'PlaceOrder', 'execute')
    const extract: ConnectionExtractBlock = { sourceType: { fromCallerType: true } }

    const result = evaluateExtractRules(extract, callExpr, 'PlaceOrder')

    expect(result).toStrictEqual({ sourceType: 'PlaceOrder' })
  })

  it('extracts static type of first argument with fromArgument 0', () => {
    const filePath = createFile(`
class OrderPlacedEvent {}
class EventBus {
  publish(event: OrderPlacedEvent): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish(new OrderPlacedEvent())
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { eventName: { fromArgument: 0 } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ eventName: 'OrderPlacedEvent' })
  })

  it('extracts static type of second argument with fromArgument 1', () => {
    const filePath = createFile(`
class OrderPlacedEvent {}
class AuditContext {}
class EventBus {
  publish(event: OrderPlacedEvent, ctx: AuditContext): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish(new OrderPlacedEvent(), new AuditContext())
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { contextType: { fromArgument: 1 } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ contextType: 'AuditContext' })
  })

  it('returns undefined for field when fromArgument index is out of bounds', () => {
    const filePath = createFile(`
class EventBus {
  publish(): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish()
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { eventName: { fromArgument: 0 } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ eventName: undefined })
  })

  it('returns undefined for field when receiver type is unresolvable', () => {
    const filePath = createFile(`
class OrderService {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.publish()
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { targetType: { fromReceiverType: true } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ targetType: undefined })
  })

  it('returns undefined for field when argument type is unresolvable', () => {
    const filePath = createFile(`
class EventBus {
  publish(event: any): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish({} as any)
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = { eventName: { fromArgument: 0 } }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({ eventName: undefined })
  })

  it('combines multiple extract rules into one result', () => {
    const filePath = createFile(`
class OrderPlacedEvent {}
class EventBus {
  publish(event: OrderPlacedEvent): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish(new OrderPlacedEvent())
  }
}
`)
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')
    const extract: ConnectionExtractBlock = {
      eventName: { fromArgument: 0 },
      targetType: { fromReceiverType: true },
      sourceType: { fromCallerType: true },
    }

    const result = evaluateExtractRules(extract, callExpr, 'OrderService')

    expect(result).toStrictEqual({
      eventName: 'OrderPlacedEvent',
      targetType: 'EventBus',
      sourceType: 'OrderService',
    })
  })

  it('returns undefined for field when argument type resolves to a primitive', () => {
    const filePath = createFile(`
class PrimitiveBus {
  publish(message: string): void {}
}
class PrimitiveCaller {
  constructor(private bus: PrimitiveBus) {}
  execute(msg: string): void {
    this.bus.publish(msg)
  }
}
`)
    const callExpr = getCallExpression(filePath, 'PrimitiveCaller', 'execute')
    const extract: ConnectionExtractBlock = { eventName: { fromArgument: 0 } }

    const result = evaluateExtractRules(extract, callExpr, 'PrimitiveCaller')

    expect(result).toStrictEqual({ eventName: undefined })
  })
})
