import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import { evaluateFromGenericArgRule } from './evaluate-extraction-rule'
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

describe('evaluateFromGenericArgRule', () => {
  it("returns ['OrderPlaced'] from IEventHandler<OrderPlaced>", () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      class OrderPlacedHandler implements IEventHandler<OrderPlaced> {
        handle(event: OrderPlaced): void {}
      }
    `)
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IEventHandler',
          position: 0,
        },
      },
      classDecl,
    )
    expect(result.value).toStrictEqual(['OrderPlaced'])
  })

  it("returns ['OrderPlaced', 'OrderCancelled'] from union type argument", () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      class MultiEventHandler implements IEventHandler<OrderPlaced | OrderCancelled> {
        handle(event: OrderPlaced | OrderCancelled): void {}
      }
    `)
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IEventHandler',
          position: 0,
        },
      },
      classDecl,
    )
    expect(result.value).toStrictEqual(['OrderPlaced', 'OrderCancelled'])
  })

  it('throws ExtractionError when interface not found', () => {
    const classDecl = createClassDeclaration(`
      class SomeClass {}
    `)
    expect(() =>
      evaluateFromGenericArgRule(
        {
          fromGenericArg: {
            interface: 'IEventHandler',
            position: 0,
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError with anonymous in message for anonymous class', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile('test.ts', 'export default class {}')
    const classDecl = sf.getClassOrThrow(() => true)
    expect(() =>
      evaluateFromGenericArgRule(
        {
          fromGenericArg: {
            interface: 'IEventHandler',
            position: 0,
          },
        },
        classDecl,
      ),
    ).toThrow(/anonymous/)
  })

  it('throws ExtractionError when position out of bounds', () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      class OrderPlacedHandler implements IEventHandler<OrderPlaced> {
        handle(event: OrderPlaced): void {}
      }
    `)
    expect(() =>
      evaluateFromGenericArgRule(
        {
          fromGenericArg: {
            interface: 'IEventHandler',
            position: 5,
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when generic arg is type parameter T', () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      class GenericHandler<T> implements IEventHandler<T> {
        handle(event: T): void {}
      }
    `)
    expect(() =>
      evaluateFromGenericArgRule(
        {
          fromGenericArg: {
            interface: 'IEventHandler',
            position: 0,
          },
        },
        classDecl,
      ),
    ).toThrow(ExtractionError)
  })

  it('uses correct interface when class implements multiple', () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      interface IQueryHandler<Q, R> { query(q: Q): R }
      class MultiHandler implements IEventHandler<OrderPlaced>, IQueryHandler<GetOrder, Order> {
        handle(event: OrderPlaced): void {}
        query(q: GetOrder): Order { return {} as Order }
      }
    `)
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IQueryHandler',
          position: 1,
        },
      },
      classDecl,
    )
    expect(result.value).toStrictEqual(['Order'])
  })

  it('applies transform to type names', () => {
    const classDecl = createClassDeclaration(`
      interface IEventHandler<T> { handle(event: T): void }
      class OrderPlacedHandler implements IEventHandler<OrderPlaced> {
        handle(event: OrderPlaced): void {}
      }
    `)
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IEventHandler',
          position: 0,
          transform: { toLowerCase: true },
        },
      },
      classDecl,
    )
    expect(result.value).toStrictEqual(['orderplaced'])
  })

  it('handles qualified type name (Namespace.Type)', () => {
    const classDecl = createClassDeclaration(`
      namespace Events { export type OrderPlaced = { id: string } }
      interface IEventHandler<T> { handle(event: T): void }
      class OrderPlacedHandler implements IEventHandler<Events.OrderPlaced> {
        handle(event: Events.OrderPlaced): void {}
      }
    `)
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IEventHandler',
          position: 0,
        },
      },
      classDecl,
    )
    expect(result.value).toStrictEqual(['Events.OrderPlaced'])
  })

  it('finds interface implemented by base class', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(
      'test.ts',
      `
      interface IEventHandler<T> { handle(event: T): void }
      class BaseHandler implements IEventHandler<OrderPlaced> {
        handle(event: OrderPlaced): void {}
      }
      class DerivedHandler extends BaseHandler {}
    `,
    )
    const derivedClass = sf.getClassOrThrow('DerivedHandler')
    const result = evaluateFromGenericArgRule(
      {
        fromGenericArg: {
          interface: 'IEventHandler',
          position: 0,
        },
      },
      derivedClass,
    )
    expect(result.value).toStrictEqual(['OrderPlaced'])
  })
})
