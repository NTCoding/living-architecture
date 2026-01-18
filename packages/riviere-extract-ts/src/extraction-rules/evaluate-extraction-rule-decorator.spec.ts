import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import {
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
} from './evaluate-extraction-rule'
import {
  TestFixtureError, ExtractionError 
} from './literal-detection'

function createDecoratorFromMethod(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test.ts', code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }
  const method = classDecl.getMethods()[0]
  if (!method) {
    throw new TestFixtureError('No method found in test code')
  }
  const decorator = method.getDecorators()[0]
  if (!decorator) {
    throw new TestFixtureError('No decorator found on method')
  }
  return decorator
}

describe('evaluateFromDecoratorArgRule (positional)', () => {
  it("returns '/orders' from @Get('/orders') at position 0", () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/orders')
        list() {}
      }
    `)
    const result = evaluateFromDecoratorArgRule({ fromDecoratorArg: { position: 0 } }, decorator)
    expect(result.value).toBe('/orders')
  })

  it("returns '/:id' from @Get('/:id') at position 0", () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/:id')
        get() {}
      }
    `)
    const result = evaluateFromDecoratorArgRule({ fromDecoratorArg: { position: 0 } }, decorator)
    expect(result.value).toBe('/:id')
  })

  it('throws ExtractionError when decorator has no arguments', () => {
    const decorator = createDecoratorFromMethod(`
      function Get() { return () => {} }
      class OrderController {
        @Get()
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { position: 0 } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when position out of bounds', () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/orders')
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { position: 5 } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when argument is object literal (not string)', () => {
    const decorator = createDecoratorFromMethod(`
      function Route(config: { path: string }) { return () => {} }
      class OrderController {
        @Route({ path: '/orders' })
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { position: 0 } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('applies transform to positional argument', () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/orders')
        list() {}
      }
    `)
    const result = evaluateFromDecoratorArgRule(
      {
        fromDecoratorArg: {
          position: 0,
          transform: { toUpperCase: true },
        },
      },
      decorator,
    )
    expect(result.value).toBe('/ORDERS')
  })
})

describe('evaluateFromDecoratorArgRule (edge cases)', () => {
  it('throws ExtractionError when neither position nor name provided', () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/orders')
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule(
        { fromDecoratorArg: { transform: { toUpperCase: true } } },
        decorator,
      ),
    ).toThrow(ExtractionError)
  })
})

describe('evaluateFromDecoratorArgRule (named)', () => {
  it('throws ExtractionError when decorator has no arguments', () => {
    const decorator = createDecoratorFromMethod(`
      function Route() { return () => {} }
      class OrderController {
        @Route()
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'path' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when property value is numeric', () => {
    const decorator = createDecoratorFromMethod(`
      function Config(config: { port: number }) { return () => {} }
      class OrderController {
        @Config({ port: 3000 })
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'port' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when property uses shorthand syntax', () => {
    const decorator = createDecoratorFromMethod(`
      function Route(config: { path: string }) { return () => {} }
      const path = '/orders';
      class OrderController {
        @Route({ path })
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'path' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when property is a method', () => {
    const decorator = createDecoratorFromMethod(`
      function Config(config: { getPath(): string }) { return () => {} }
      class OrderController {
        @Config({ getPath() { return '/orders' } })
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'getPath' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it("returns '/orders' from @Route({ path: '/orders' }) with name 'path'", () => {
    const decorator = createDecoratorFromMethod(`
      function Route(config: { path: string }) { return () => {} }
      class OrderController {
        @Route({ path: '/orders' })
        list() {}
      }
    `)
    const result = evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'path' } }, decorator)
    expect(result.value).toBe('/orders')
  })

  it('throws ExtractionError when named property not found in object argument', () => {
    const decorator = createDecoratorFromMethod(`
      function Route(config: { path: string }) { return () => {} }
      class OrderController {
        @Route({ path: '/orders' })
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'nonexistent' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when argument is not object literal', () => {
    const decorator = createDecoratorFromMethod(`
      function Get(path: string) { return () => {} }
      class OrderController {
        @Get('/orders')
        list() {}
      }
    `)
    expect(() =>
      evaluateFromDecoratorArgRule({ fromDecoratorArg: { name: 'path' } }, decorator),
    ).toThrow(ExtractionError)
  })

  it('applies transform to named argument', () => {
    const decorator = createDecoratorFromMethod(`
      function Route(config: { path: string }) { return () => {} }
      class OrderController {
        @Route({ path: '/orders' })
        list() {}
      }
    `)
    const result = evaluateFromDecoratorArgRule(
      {
        fromDecoratorArg: {
          name: 'path',
          transform: { toUpperCase: true },
        },
      },
      decorator,
    )
    expect(result.value).toBe('/ORDERS')
  })
})

describe('evaluateFromDecoratorNameRule', () => {
  it("returns 'Get' for @Get decorated method when rule is true", () => {
    const decorator = createDecoratorFromMethod(`
      function Get() { return () => {} }
      class OrderController {
        @Get()
        list() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule({ fromDecoratorName: true }, decorator)
    expect(result.value).toBe('Get')
  })

  it("returns 'GET' when mapping { Get: 'GET' } applied", () => {
    const decorator = createDecoratorFromMethod(`
      function Get() { return () => {} }
      class OrderController {
        @Get()
        list() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule(
      { fromDecoratorName: { mapping: { Get: 'GET' } } },
      decorator,
    )
    expect(result.value).toBe('GET')
  })

  it("returns 'POST' when mapping { Post: 'POST' } applied", () => {
    const decorator = createDecoratorFromMethod(`
      function Post() { return () => {} }
      class OrderController {
        @Post()
        create() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule(
      { fromDecoratorName: { mapping: { Post: 'POST' } } },
      decorator,
    )
    expect(result.value).toBe('POST')
  })

  it('returns original name when mapping does not include decorator', () => {
    const decorator = createDecoratorFromMethod(`
      function Delete() { return () => {} }
      class OrderController {
        @Delete()
        remove() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule(
      { fromDecoratorName: { mapping: { Get: 'GET' } } },
      decorator,
    )
    expect(result.value).toBe('Delete')
  })

  it('applies transform to decorator name', () => {
    const decorator = createDecoratorFromMethod(`
      function Get() { return () => {} }
      class OrderController {
        @Get()
        list() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule(
      { fromDecoratorName: { transform: { toLowerCase: true } } },
      decorator,
    )
    expect(result.value).toBe('get')
  })

  it('applies transform after mapping', () => {
    const decorator = createDecoratorFromMethod(`
      function Get() { return () => {} }
      class OrderController {
        @Get()
        list() {}
      }
    `)
    const result = evaluateFromDecoratorNameRule(
      {
        fromDecoratorName: {
          mapping: { Get: 'HttpGet' },
          transform: { toLowerCase: true },
        },
      },
      decorator,
    )
    expect(result.value).toBe('httpget')
  })
})
