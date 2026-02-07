import {
  describe, it, expect 
} from 'vitest'
import type { ClassDeclaration } from 'ts-morph'
import {
  callerHasDecorator, calleeHasDecorator 
} from './decorator-matching'
import {
  createTestProject, createTestFile, getFirstCallExpression 
} from './configurable-fixtures'

const project = createTestProject({ experimentalDecorators: true })

function createFile(content: string): string {
  return createTestFile(project, content)
}

function getCallerClass(filePath: string, className: string): ClassDeclaration {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  return sourceFile.getClassOrThrow(className)
}

function getCallExpression(filePath: string, className: string, methodName: string) {
  return getFirstCallExpression(project, filePath, className, methodName)
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
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')

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
    const callExpr = getCallExpression(filePath, 'PlainCaller', 'execute')

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
    const callExpr = getCallExpression(filePath, 'OrderService', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(true)
  })

  it('returns false for non-matching decorator name', () => {
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
    const callExpr = getCallExpression(filePath, 'Caller', 'execute')

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
    const callExpr = getCallExpression(filePath, 'FreeCaller', 'execute')

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
    const callExpr = getCallExpression(filePath, 'SymbollessCaller', 'execute')

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
    const callExpr = getCallExpression(filePath, 'InterfaceCaller', 'execute')

    expect(calleeHasDecorator(callExpr, 'Injectable')).toBe(false)
  })
})
