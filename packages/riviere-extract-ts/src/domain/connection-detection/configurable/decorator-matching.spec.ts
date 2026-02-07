import {
  describe, it, expect 
} from 'vitest'
import {
  Project, SyntaxKind, type CallExpression, type ClassDeclaration 
} from 'ts-morph'
import { CallExpressionNotFoundError } from '../call-graph/type-resolver-fixtures'
import {
  callerHasDecorator, calleeHasDecorator 
} from './decorator-matching'

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    strict: true,
    target: 99,
    module: 99,
    experimentalDecorators: true,
  },
})

const counter = { value: 0 }

function createFile(content: string): string {
  counter.value++
  const filePath = `/src/test-decorator-matching-${counter.value}.ts`
  project.createSourceFile(filePath, content)
  return filePath
}

function getCallerClass(filePath: string, className: string): ClassDeclaration {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  return sourceFile.getClassOrThrow(className)
}

function getFirstCallExpression(
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

describe('callerHasDecorator', () => {
  it('returns true when caller class has the decorator', () => {
    const filePath = createFile(`
function Controller(path: string) { return (target: any) => target }
@Controller('/orders')
class OrdersController {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'OrdersController')

    expect(callerHasDecorator(callerClass, ['Controller'])).toBe(true)
  })

  it('returns false when caller class lacks the decorator', () => {
    const filePath = createFile(`
class PlainService {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'PlainService')

    expect(callerHasDecorator(callerClass, ['Controller'])).toBe(false)
  })

  it('returns true when caller class has any of multiple specified decorators', () => {
    const filePath = createFile(`
function Injectable() { return (target: any) => target }
@Injectable()
class OrderService {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'OrderService')

    expect(callerHasDecorator(callerClass, ['Controller', 'Injectable'])).toBe(true)
  })

  it('matches decorator name-only when decorator has arguments', () => {
    const filePath = createFile(`
function Controller(path: string) { return (target: any) => target }
@Controller('/orders')
class OrdersController {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'OrdersController')

    expect(callerHasDecorator(callerClass, ['Controller'])).toBe(true)
  })

  it('matches decorator when called with empty parens', () => {
    const filePath = createFile(`
function Controller() { return (target: any) => target }
@Controller()
class OrdersController {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'OrdersController')

    expect(callerHasDecorator(callerClass, ['Controller'])).toBe(true)
  })

  it('matches decorator when used without parens', () => {
    const filePath = createFile(`
function Sealed(target: any) { return target }
@Sealed
class OrdersController {
  handle(): void {}
}
`)
    const callerClass = getCallerClass(filePath, 'OrdersController')

    expect(callerHasDecorator(callerClass, ['Sealed'])).toBe(true)
  })
})

describe('calleeHasDecorator', () => {
  it('returns true when callee class has the decorator', () => {
    const filePath = createFile(`
function Injectable() { return (target: any) => target }
@Injectable()
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

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(true)
  })

  it('returns false when callee class lacks the decorator', () => {
    const filePath = createFile(`
class PlainRepository {
  save(): void {}
}
class PlainCaller {
  constructor(private repo: PlainRepository) {}
  execute(): void {
    this.repo.save()
  }
}
`)
    const callExpr = getFirstCallExpression(filePath, 'PlainCaller', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(false)
  })

  it('matches callee decorator name-only when decorator has arguments', () => {
    const filePath = createFile(`
function Injectable(scope: string) { return (target: any) => target }
@Injectable('singleton')
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

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(true)
  })

  it('returns false for composed decorators — factory decorator producing another is not followed', () => {
    const filePath = createFile(`
function Auth() { return (target: any) => target }
@Auth()
class SecureService {
  handle(): void {}
}
class Caller {
  constructor(private svc: SecureService) {}
  execute(): void {
    this.svc.handle()
  }
}
`)
    const callExpr = getFirstCallExpression(filePath, 'Caller', 'execute')

    expect(calleeHasDecorator(callExpr, 'UseGuards')).toBe(false)
  })

  it('returns false when call expression has no property access receiver', () => {
    const filePath = createFile(`
function freeFunction(): void {}
class FreeCaller {
  execute(): void {
    freeFunction()
  }
}
`)
    const callExpr = getFirstCallExpression(filePath, 'FreeCaller', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(false)
  })

  it('returns false when receiver type has no symbol', () => {
    const filePath = createFile(`
class SymbollessCaller {
  constructor(private dep: any) {}
  execute(): void {
    this.dep.save()
  }
}
`)
    const callExpr = getFirstCallExpression(filePath, 'SymbollessCaller', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(false)
  })

  it('returns false when receiver type resolves to non-class declaration', () => {
    const filePath = createFile(`
interface NonClassTarget {
  save(): void
}
class InterfaceCaller {
  constructor(private dep: NonClassTarget) {}
  execute(): void {
    this.dep.save()
  }
}
`)
    const callExpr = getFirstCallExpression(filePath, 'InterfaceCaller', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(false)
  })
})
