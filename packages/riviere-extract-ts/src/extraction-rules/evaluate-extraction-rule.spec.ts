import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import {
  evaluateLiteralRule,
  evaluateFromClassNameRule,
  evaluateFromMethodNameRule,
  evaluateFromFilePathRule,
  evaluateFromPropertyRule,
} from './evaluate-extraction-rule'
import {
  TestFixtureError, ExtractionError 
} from './literal-detection'

function createClassDeclaration(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test.ts', code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }
  return classDecl
}

function createMethodDeclaration(code: string, methodName: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test.ts', code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }
  const method = classDecl.getMethod(methodName)
  if (!method) {
    throw new TestFixtureError(`Method '${methodName}' not found`)
  }
  return method
}

describe('evaluateLiteralRule', () => {
  it("returns { value: 'REST' } when rule is { literal: 'REST' }", () => {
    const result = evaluateLiteralRule({ literal: 'REST' })
    expect(result.value).toBe('REST')
  })

  it('returns { value: 42 } when rule is { literal: 42 }', () => {
    const result = evaluateLiteralRule({ literal: 42 })
    expect(result.value).toBe(42)
  })

  it('returns { value: true } when rule is { literal: true }', () => {
    const result = evaluateLiteralRule({ literal: true })
    expect(result.value).toBe(true)
  })
})

describe('evaluateFromClassNameRule', () => {
  it("returns 'OrderController' for class named OrderController", () => {
    const classDecl = createClassDeclaration('class OrderController {}')
    const result = evaluateFromClassNameRule({ fromClassName: true }, classDecl)
    expect(result.value).toBe('OrderController')
  })

  it("returns 'OrderController' when fromClassName is object without transform", () => {
    const classDecl = createClassDeclaration('class OrderController {}')
    const result = evaluateFromClassNameRule({ fromClassName: {} }, classDecl)
    expect(result.value).toBe('OrderController')
  })

  it('returns empty string for default exported anonymous class', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile('test.ts', 'export default class {}')
    const classDecl = sf.getClassOrThrow(() => true)
    const result = evaluateFromClassNameRule({ fromClassName: true }, classDecl)
    expect(result.value).toBe('')
  })

  it("returns 'PlaceOrder' when transform stripSuffix 'Controller' applied", () => {
    const classDecl = createClassDeclaration('class PlaceOrderController {}')
    const result = evaluateFromClassNameRule(
      { fromClassName: { transform: { stripSuffix: 'Controller' } } },
      classDecl,
    )
    expect(result.value).toBe('PlaceOrder')
  })

  it('returns lowercase when transform toLowerCase applied after stripSuffix', () => {
    const classDecl = createClassDeclaration('class PlaceOrderController {}')
    const result = evaluateFromClassNameRule(
      {
        fromClassName: {
          transform: {
            stripSuffix: 'Controller',
            toLowerCase: true,
          },
        },
      },
      classDecl,
    )
    expect(result.value).toBe('placeorder')
  })
})

describe('evaluateFromMethodNameRule', () => {
  it("returns 'placeOrder' for method named placeOrder", () => {
    const method = createMethodDeclaration('class Test { placeOrder() {} }', 'placeOrder')
    const result = evaluateFromMethodNameRule({ fromMethodName: true }, method)
    expect(result.value).toBe('placeOrder')
  })

  it("returns 'placeOrder' when fromMethodName is object without transform", () => {
    const method = createMethodDeclaration('class Test { placeOrder() {} }', 'placeOrder')
    const result = evaluateFromMethodNameRule({ fromMethodName: {} }, method)
    expect(result.value).toBe('placeOrder')
  })

  it("returns 'PLACEORDER' when transform toUpperCase applied", () => {
    const method = createMethodDeclaration('class Test { placeOrder() {} }', 'placeOrder')
    const result = evaluateFromMethodNameRule(
      { fromMethodName: { transform: { toUpperCase: true } } },
      method,
    )
    expect(result.value).toBe('PLACEORDER')
  })
})

describe('evaluateFromFilePathRule', () => {
  it("returns 'orders' when pattern 'src/(.*)/api' captures from 'src/orders/api/controller.ts'", () => {
    const result = evaluateFromFilePathRule(
      {
        fromFilePath: {
          pattern: 'src/(.*)/api',
          capture: 1,
        },
      },
      'src/orders/api/controller.ts',
    )
    expect(result.value).toBe('orders')
  })

  it('returns capture group at specified index', () => {
    const result = evaluateFromFilePathRule(
      {
        fromFilePath: {
          pattern: 'src/(.*)/(.*)/',
          capture: 2,
        },
      },
      'src/orders/api/controller.ts',
    )
    expect(result.value).toBe('api')
  })

  it('throws ExtractionError when pattern has no match', () => {
    expect(() =>
      evaluateFromFilePathRule(
        {
          fromFilePath: {
            pattern: 'nonexistent/(.*)',
            capture: 1,
          },
        },
        'src/orders/api/controller.ts',
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when capture group index out of bounds', () => {
    expect(() =>
      evaluateFromFilePathRule(
        {
          fromFilePath: {
            pattern: 'src/(.*)/api',
            capture: 5,
          },
        },
        'src/orders/api/controller.ts',
      ),
    ).toThrow(ExtractionError)
  })

  it('applies transform to captured value', () => {
    const result = evaluateFromFilePathRule(
      {
        fromFilePath: {
          pattern: 'src/(.*)/api',
          capture: 1,
          transform: { toUpperCase: true },
        },
      },
      'src/orders/api/controller.ts',
    )
    expect(result.value).toBe('ORDERS')
  })
})

describe('evaluateFromPropertyRule (static)', () => {
  it("returns '/orders' from static route = '/orders'", () => {
    const classDecl = createClassDeclaration(`class OrderController { static route = '/orders' }`)
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'route',
          kind: 'static',
        },
      },
      classDecl,
    )
    expect(result.value).toBe('/orders')
  })

  it("returns 'POST' from static method = 'POST'", () => {
    const classDecl = createClassDeclaration(`class OrderController { static method = 'POST' }`)
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'method',
          kind: 'static',
        },
      },
      classDecl,
    )
    expect(result.value).toBe('POST')
  })

  it('throws ExtractionError when property not found', () => {
    const classDecl = createClassDeclaration(`class OrderController { static route = '/orders' }`)
    expect(() =>
      evaluateFromPropertyRule(
        {
          fromProperty: {
            name: 'nonexistent',
            kind: 'static',
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError with anonymous class name when property not found', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile('test.ts', 'export default class {}')
    const classDecl = sf.getClassOrThrow(() => true)
    expect(() =>
      evaluateFromPropertyRule(
        {
          fromProperty: {
            name: 'nonexistent',
            kind: 'static',
          },
        },
        classDecl,
      ),
    ).toThrow(/anonymous/)
  })

  it('throws ExtractionError when property initializer is enum member', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(
      'test.ts',
      `
      enum HttpMethod { GET, POST }
      class OrderController { static method = HttpMethod.POST }
    `,
    )
    const classDecl = sf.getClassOrThrow(() => true)
    expect(() =>
      evaluateFromPropertyRule(
        {
          fromProperty: {
            name: 'method',
            kind: 'static',
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when property initializer is template literal', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(
      'test.ts',
      `
      const id = 'test';
      class OrderController { static route = \`/api/\${id}\` }
    `,
    )
    const classDecl = sf.getClassOrThrow(() => true)
    expect(() =>
      evaluateFromPropertyRule(
        {
          fromProperty: {
            name: 'route',
            kind: 'static',
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('resolves property from parent class (inheritance chain)', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(
      'test.ts',
      `
      class BaseController { static basePath = '/api' }
      class OrderController extends BaseController {}
    `,
    )
    const classDecl = sf.getClassOrThrow((c) => c.getName() === 'OrderController')
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'basePath',
          kind: 'static',
        },
      },
      classDecl,
    )
    expect(result.value).toBe('/api')
  })

  it('applies transform to extracted value', () => {
    const classDecl = createClassDeclaration(`class OrderController { static route = '/orders' }`)
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'route',
          kind: 'static',
          transform: { toUpperCase: true },
        },
      },
      classDecl,
    )
    expect(result.value).toBe('/ORDERS')
  })

  it('returns numeric value unchanged when transform specified', () => {
    const classDecl = createClassDeclaration(`class OrderController { static port = 3000 }`)
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'port',
          kind: 'static',
          transform: { toUpperCase: true },
        },
      },
      classDecl,
    )
    expect(result.value).toBe(3000)
  })
})

describe('evaluateFromPropertyRule (instance)', () => {
  it("returns 'OrderPlaced' from readonly type = 'OrderPlaced'", () => {
    const classDecl = createClassDeclaration(
      `class OrderPlacedEvent { readonly type = 'OrderPlaced' }`,
    )
    const result = evaluateFromPropertyRule(
      {
        fromProperty: {
          name: 'type',
          kind: 'instance',
        },
      },
      classDecl,
    )
    expect(result.value).toBe('OrderPlaced')
  })

  it('throws ExtractionError when instance property not found', () => {
    const classDecl = createClassDeclaration(
      `class OrderPlacedEvent { readonly type = 'OrderPlaced' }`,
    )
    expect(() =>
      evaluateFromPropertyRule(
        {
          fromProperty: {
            name: 'nonexistent',
            kind: 'instance',
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })
})
