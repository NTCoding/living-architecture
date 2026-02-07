import {
  describe, it, expect 
} from 'vitest'
import {
  Project, SyntaxKind, type CallExpression 
} from 'ts-morph'
import type { ConnectionExtractBlock } from '@living-architecture/riviere-extract-config'
import { CallExpressionNotFoundError } from '../call-graph/type-resolver-fixtures'
import { evaluateExtractRules } from './evaluate-extract-rules'

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    strict: true,
    target: 99,
    module: 99,
  },
})

const counter = { value: 0 }

function createFile(content: string): string {
  counter.value++
  const filePath = `/src/test-extract-rules-${counter.value}.ts`
  project.createSourceFile(filePath, content)
  return filePath
}

function getCallExpression(
  filePath: string,
  className: string,
  methodName: string,
): CallExpression {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  const classDecl = sourceFile.getClassOrThrow(className)
  const method = classDecl.getMethodOrThrow(methodName)
  const callExprs = method.getDescendantsOfKind(SyntaxKind.CallExpression)
  const [first] = callExprs
  if (!first) throw new CallExpressionNotFoundError(className, methodName)
  return first
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
