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
  CallExpressionNotFoundError,
} from './type-resolver-fixtures'

describe('resolveCallExpressionReceiverType coverage', () => {
  it('returns uncertain when call has no property access receiver in lenient mode', () => {
    const filePath = nextFile(`
      function doSomething(): void {}
      class Invoker {
        execute(): void {
          doSomething()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'Invoker', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: 'Call expression has no property access receiver',
    })
  })

  it('throws ConnectionDetectionError when call has no property access receiver in strict mode', () => {
    const filePath = nextFile(`
      function doSomethingElse(): void {}
      class StrictInvoker {
        execute(): void {
          doSomethingElse()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'StrictInvoker', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    expect(() => resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: true })).toThrow(
      ConnectionDetectionError,
    )
  })

  it('returns any when variable type annotation is any', () => {
    const filePath = nextFile(`
      class VarAnnotService {
        process(): void {}
      }
      function varAnnotTest(): void {
        const ref: any = new VarAnnotService()
        ref.process()
      }
    `)

    const callExpr = getCallExpressionFromFunction(filePath, 'varAnnotTest')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('resolves type when receiver is a chained method call expression', () => {
    const filePath = nextFile(`
      class ChainResult2 {
        doWork(): void {}
      }
      class ChainFactory2 {
        create(): ChainResult2 { return new ChainResult2() }
      }
      class ChainConsumer2 {
        private factory: ChainFactory2
        constructor(factory: ChainFactory2) { this.factory = factory }
        execute(): void {
          this.factory.create().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'ChainConsumer2', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'ChainResult2',
    })
  })

  it('returns any when variable has no type annotation and no initializer', () => {
    const filePath = nextFile(`
      function noInitTest(): void {
        let ref
        ref = {} as any
        ref.doStuff()
      }
    `)

    const callExpr = getCallExpressionFromFunction(filePath, 'noInitTest')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('returns any when receiver is a function parameter with type any', () => {
    const filePath = nextFile(`
      function paramTest(dep: any): void {
        dep.doStuff()
      }
    `)

    const callExpr = getCallExpressionFromFunction(filePath, 'paramTest')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('handles receiver type unknown as unresolvable', () => {
    const filePath = nextFile(`
      class UnknownCaller {
        constructor(private dep: unknown) {}
        execute(): void {
          (this.dep as any).run()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'UnknownCaller', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('returns unresolvable when variable has declared type any and no initializer', () => {
    const filePath = nextFile(`
      declare let untyped: any
      class UntypedCaller {
        execute(): void {
          untyped.doThing()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'UntypedCaller', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('falls back to inferred type when chained call has no return type annotation', () => {
    const filePath = nextFile(`
      class NoAnnotResult {
        doWork(): void {}
      }
      class NoAnnotFactory {
        create() { return new NoAnnotResult() }
      }
      class NoAnnotConsumer {
        private factory: NoAnnotFactory
        constructor(factory: NoAnnotFactory) { this.factory = factory }
        execute(): void {
          this.factory.create().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'NoAnnotConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'NoAnnotResult',
    })
  })

  it('resolves variable with await initializer through return type', () => {
    const filePath = nextFile(`
      class AwaitVarResult {
        doWork(): void {}
      }
      class AwaitVarFactory {
        async create(): Promise<any> {
          return new AwaitVarResult()
        }
      }
      class AwaitVarConsumer {
        constructor(private factory: AwaitVarFactory) {}
        async run(): Promise<void> {
          const ref = await this.factory.create()
          ref.doWork()
        }
      }
    `)

    const callExpr = getCallExpressionByText(filePath, 'AwaitVarConsumer', 'run', 'ref.doWork')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('returns any when variable initializer is non-await expression', () => {
    const filePath = nextFile(`
      class NonAwaitConsumer {
        execute(): void {
          const ref = undefined as any
          ref.doStuff()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'NonAwaitConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('strips generic arguments from chained call return type annotation', () => {
    const filePath = nextFile(`
      class GenericResult<T> {
        doWork(): void {}
      }
      class GenericFactory {
        create(): GenericResult<string> { return new GenericResult<string>() }
      }
      class GenericConsumer {
        private factory: GenericFactory
        constructor(factory: GenericFactory) { this.factory = factory }
        execute(): void {
          this.factory.create().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'GenericConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'GenericResult',
    })
  })

  it('falls back to type inference when chained call receiver is bare function', () => {
    const filePath = nextFile(`
      class BareResult {
        doWork(): void {}
      }
      function createBareResult(): BareResult { return new BareResult() }
      class BareChainConsumer {
        execute(): void {
          createBareResult().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'BareChainConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'BareResult',
    })
  })

  it('falls back to type inference when chained call receiver type has no symbol', () => {
    const filePath = nextFile(`
      class NoSymbolChain {
        execute(): void {
          (42).toString().valueOf()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'NoSymbolChain', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'string',
    })
  })

  it('falls back to type inference when chained call method not found on class', () => {
    const filePath = nextFile(`
      class NoMethodClass {
        doStuff(): void {}
      }
      class NoMethodChainConsumer {
        private dep: NoMethodClass
        constructor(dep: NoMethodClass) { this.dep = dep }
        execute(): void {
          this.dep.nonExistent().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'NoMethodChainConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('returns unresolvable when await operand is not a call expression', () => {
    const filePath = nextFile(`
      class AwaitNonCallConsumer2 {
        private pending: Promise<any>
        constructor(pending: Promise<any>) { this.pending = pending }
        async run(): Promise<void> {
          const ref = await this.pending
          ref.execute()
        }
      }
    `)

    const callExpr = getCallExpressionByText(
      filePath,
      'AwaitNonCallConsumer2',
      'run',
      'ref.execute',
    )
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('any'),
    })
  })

  it('falls back to type inference when chained call receiver is interface-typed', () => {
    const filePath = nextFile(`
      class InterfaceChainResult {
        doWork(): void {}
      }
      interface IInterfaceFactory {
        create(): InterfaceChainResult
      }
      class InterfaceChainConsumer {
        constructor(private factory: IInterfaceFactory) {}
        execute(): void {
          this.factory.create().doWork()
        }
      }
    `)

    const callExpr = getFirstCallExpression(filePath, 'InterfaceChainConsumer', 'execute')
    const sourceFile = sharedProject.getSourceFileOrThrow(filePath)

    const result = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'InterfaceChainResult',
    })
  })
})

describe('type-resolver fixture helpers', () => {
  it('throws CallExpressionNotFoundError when method has no call expressions', () => {
    const filePath = nextFile(`
      class EmptyMethod {
        execute(): void {}
      }
    `)

    expect(() => getFirstCallExpression(filePath, 'EmptyMethod', 'execute')).toThrow(
      CallExpressionNotFoundError,
    )
  })

  it('throws CallExpressionNotFoundError when function has no call expressions', () => {
    const filePath = nextFile(`
      function emptyFunction(): void {}
    `)

    expect(() => getCallExpressionFromFunction(filePath, 'emptyFunction')).toThrow(
      CallExpressionNotFoundError,
    )
  })

  it('throws CallExpressionNotFoundError when no call matches text', () => {
    const filePath = nextFile(`
      class TextMismatch {
        execute(): void { console.log('hi') }
      }
    `)

    expect(() =>
      getCallExpressionByText(filePath, 'TextMismatch', 'execute', 'nonExistent'),
    ).toThrow(CallExpressionNotFoundError)
  })
})
