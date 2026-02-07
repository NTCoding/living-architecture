import {
  describe, it, expect 
} from 'vitest'
import { resolveCallExpressionReceiverType } from './type-resolver'
import { ConnectionDetectionError } from '../connection-detection-error'
import {
  sharedProject,
  nextFile,
  getFirstCallExpression,
  getCallExpressionFromFunction,
  getCallExpressionByText,
} from './type-resolver-fixtures'

describe('resolveCallExpressionReceiverType', () => {
  it('resolves type from explicitly typed constructor parameter', () => {
    const filePath = nextFile(`
      class OrderRepository {
        save(): void {}
      }
      class OrderService {
        constructor(private repo: OrderRepository) {}
        execute(): void {
          this.repo.save()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'OrderService', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'OrderRepository',
    })
  })

  it('resolves type from explicitly typed field declaration', () => {
    const filePath = nextFile(`
      class PaymentGateway {
        charge(): void {}
      }
      class PaymentService {
        private gateway: PaymentGateway = new PaymentGateway()
        process(): void {
          this.gateway.charge()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'PaymentService', 'process')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'PaymentGateway',
    })
  })

  it('resolves type from explicitly typed local variable', () => {
    const filePath = nextFile(`
      class Notifier {
        notify(): void {}
      }
      function doWork(): void {
        const notifier: Notifier = new Notifier()
        notifier.notify()
      }
    `)

    const callExpr = getCallExpressionFromFunction(filePath, 'doWork')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'Notifier',
    })
  })

  it('strips generic arguments - Repository<Order> resolves to Repository', () => {
    const filePath = nextFile(`
      class Repository<T> {
        save(item: T): void {}
      }
      class Order {}
      class OrderService {
        constructor(private repo: Repository<Order>) {}
        execute(): void {
          this.repo.save(new Order())
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'OrderService', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'Repository',
    })
  })

  it('resolves return type for chained call a.find().activate()', () => {
    const filePath = nextFile(`
      class ChainedOrder {
        activate(): void {}
      }
      class ChainedRepo {
        find(): ChainedOrder { return new ChainedOrder() }
      }
      class ChainedService {
        constructor(private repo: ChainedRepo) {}
        execute(): void {
          this.repo.find().activate()
        }
      }
    `)

    const activateCall = getFirstCallExpression(filePath, 'ChainedService', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(activateCall, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'ChainedOrder',
    })
  })

  it('resolves through await - Promise<Order> resolves to Order', () => {
    const filePath = nextFile(`
      class AwaitedOrder {
        activate(): void {}
      }
      class AwaitedRepo {
        async find(): Promise<AwaitedOrder> { return new AwaitedOrder() }
      }
      class AwaitedService {
        constructor(private repo: AwaitedRepo) {}
        async execute(): Promise<void> {
          const order = await this.repo.find()
          order.activate()
        }
      }
    `)

    const activateCall = getCallExpressionByText(
      filePath,
      'AwaitedService',
      'execute',
      'order.activate',
    )
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(activateCall, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'AwaitedOrder',
    })
  })

  it('throws ConnectionDetectionError in strict mode when parameter has no type annotation', () => {
    const filePath = nextFile(`
      class OrderService {
        constructor(private repo: any) {}
        execute(): void {
          this.repo.save()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'OrderService', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    expect(() => resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: true })).toThrow(
      ConnectionDetectionError,
    )
  })

  it('returns uncertain in lenient mode when parameter has no type annotation', () => {
    const filePath = nextFile(`
      class OrderService {
        constructor(private repo: any) {}
        execute(): void {
          this.repo.save()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'OrderService', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('resolves type from variable with explicit type annotation when type is unresolvable', () => {
    const filePath = nextFile(`
      class AnnotatedTarget {
        run(): void {}
      }
      function annotatedTest(): void {
        const target: AnnotatedTarget = {} as AnnotatedTarget
        target.run()
      }
    `)

    const callExpr = getCallExpressionFromFunction(filePath, 'annotatedTest')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'AnnotatedTarget',
    })
  })

  it('resolves type from awaited call return type when variable has no type annotation', () => {
    const filePath = nextFile(`
      class AwaitTarget {
        execute(): void {}
      }
      class AwaitFactory {
        async create(): Promise<AwaitTarget> { return new AwaitTarget() }
      }
      class AwaitConsumer {
        constructor(private factory: AwaitFactory) {}
        async run(): Promise<void> {
          const result = await this.factory.create()
          result.execute()
        }
      }
    `)

    const callExpr = getCallExpressionByText(filePath, 'AwaitConsumer', 'run', 'result.execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'AwaitTarget',
    })
  })
})
