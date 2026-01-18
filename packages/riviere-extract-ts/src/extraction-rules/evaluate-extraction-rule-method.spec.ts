import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import {
  evaluateFromMethodSignatureRule,
  evaluateFromConstructorParamsRule,
  evaluateFromParameterTypeRule,
} from './evaluate-extraction-rule'
import {
  ExtractionError, TestFixtureError 
} from './literal-detection'

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

function createClassDeclaration(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test.ts', code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }
  return classDecl
}

describe('evaluateFromMethodSignatureRule', () => {
  it("returns { parameters: [{name: 'orderId', type: 'string'}], returnType: 'Order' }", () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        getOrder(orderId: string): Order { return {} as Order }
      }
    `,
      'getOrder',
    )
    const result = evaluateFromMethodSignatureRule({ fromMethodSignature: true }, method)
    expect(result.value).toStrictEqual({
      parameters: [
        {
          name: 'orderId',
          type: 'string',
        },
      ],
      returnType: 'Order',
    })
  })

  it('returns empty parameters array when method has no params', () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        listOrders(): Order[] { return [] }
      }
    `,
      'listOrders',
    )
    const result = evaluateFromMethodSignatureRule({ fromMethodSignature: true }, method)
    expect(result.value).toStrictEqual({
      parameters: [],
      returnType: 'Order[]',
    })
  })

  it("returns 'void' for void return type", () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        deleteOrder(orderId: string): void {}
      }
    `,
      'deleteOrder',
    )
    const result = evaluateFromMethodSignatureRule({ fromMethodSignature: true }, method)
    expect(result.value).toStrictEqual({
      parameters: [
        {
          name: 'orderId',
          type: 'string',
        },
      ],
      returnType: 'void',
    })
  })

  it('returns multiple parameters', () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        createOrder(customerId: string, amount: number): Order { return {} as Order }
      }
    `,
      'createOrder',
    )
    const result = evaluateFromMethodSignatureRule({ fromMethodSignature: true }, method)
    expect(result.value).toStrictEqual({
      parameters: [
        {
          name: 'customerId',
          type: 'string',
        },
        {
          name: 'amount',
          type: 'number',
        },
      ],
      returnType: 'Order',
    })
  })

  it("returns 'unknown' for parameter without type annotation", () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        processOrder(orderId) { return {} }
      }
    `,
      'processOrder',
    )
    const result = evaluateFromMethodSignatureRule({ fromMethodSignature: true }, method)
    expect(result.value).toStrictEqual({
      parameters: [
        {
          name: 'orderId',
          type: 'unknown',
        },
      ],
      returnType: 'unknown',
    })
  })
})

describe('evaluateFromConstructorParamsRule', () => {
  it("returns [{name: 'orderId', type: 'string'}, {name: 'amount', type: 'number'}]", () => {
    const classDecl = createClassDeclaration(`
      class OrderPlacedEvent {
        constructor(orderId: string, amount: number) {}
      }
    `)
    const result = evaluateFromConstructorParamsRule({ fromConstructorParams: true }, classDecl)
    expect(result.value).toStrictEqual([
      {
        name: 'orderId',
        type: 'string',
      },
      {
        name: 'amount',
        type: 'number',
      },
    ])
  })

  it('returns empty array when no constructor', () => {
    const classDecl = createClassDeclaration(`
      class OrderPlacedEvent {}
    `)
    const result = evaluateFromConstructorParamsRule({ fromConstructorParams: true }, classDecl)
    expect(result.value).toStrictEqual([])
  })

  it('returns empty array when constructor has no parameters', () => {
    const classDecl = createClassDeclaration(`
      class OrderPlacedEvent {
        constructor() {}
      }
    `)
    const result = evaluateFromConstructorParamsRule({ fromConstructorParams: true }, classDecl)
    expect(result.value).toStrictEqual([])
  })
})

describe('evaluateFromParameterTypeRule', () => {
  it("returns 'OrderDto' for parameter at position 0", () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        createOrder(dto: OrderDto): Order { return {} as Order }
      }
    `,
      'createOrder',
    )
    const result = evaluateFromParameterTypeRule({ fromParameterType: { position: 0 } }, method)
    expect(result.value).toBe('OrderDto')
  })

  it('returns type at specified position', () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        createOrder(customerId: string, dto: OrderDto): Order { return {} as Order }
      }
    `,
      'createOrder',
    )
    const result = evaluateFromParameterTypeRule({ fromParameterType: { position: 1 } }, method)
    expect(result.value).toBe('OrderDto')
  })

  it('applies transform to parameter type', () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        createOrder(dto: OrderDto): Order { return {} as Order }
      }
    `,
      'createOrder',
    )
    const result = evaluateFromParameterTypeRule(
      {
        fromParameterType: {
          position: 0,
          transform: { toLowerCase: true },
        },
      },
      method,
    )
    expect(result.value).toBe('orderdto')
  })

  it("returns 'unknown' for parameter without type annotation", () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        processOrder(orderId) { return {} }
      }
    `,
      'processOrder',
    )
    const result = evaluateFromParameterTypeRule({ fromParameterType: { position: 0 } }, method)
    expect(result.value).toBe('unknown')
  })

  it('throws ExtractionError when position is out of bounds', () => {
    const method = createMethodDeclaration(
      `
      class OrderService {
        createOrder(dto: OrderDto): Order { return {} as Order }
      }
    `,
      'createOrder',
    )
    expect(() =>
      evaluateFromParameterTypeRule({ fromParameterType: { position: 5 } }, method),
    ).toThrow(ExtractionError)
    expect(() =>
      evaluateFromParameterTypeRule({ fromParameterType: { position: 5 } }, method),
    ).toThrow('Parameter position 5 out of bounds. Method has 1 parameter(s)')
  })
})
