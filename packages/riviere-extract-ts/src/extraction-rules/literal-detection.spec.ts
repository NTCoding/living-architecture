import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import {
  isLiteralValue,
  extractLiteralValue,
  ExtractionError,
  TestFixtureError,
} from './literal-detection'

function createTestProject(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  return project.createSourceFile('test.ts', code)
}

function getPropertyInitializer(code: string, propertyName: string) {
  const sf = createTestProject(code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }
  const prop = classDecl.getProperty(propertyName)
  if (!prop) {
    throw new TestFixtureError(`Property '${propertyName}' not found`)
  }
  return prop.getInitializer()
}

describe('TestFixtureError', () => {
  it('creates error with provided message', () => {
    const error = new TestFixtureError('fixture setup failed')
    expect(error.message).toBe('fixture setup failed')
    expect(error.name).toBe('TestFixtureError')
  })
})

describe('isLiteralValue', () => {
  it("returns true for string literal 'POST'", () => {
    const initializer = getPropertyInitializer(`class Test { static method = 'POST' }`, 'method')
    expect(isLiteralValue(initializer)).toBe(true)
  })

  it('returns true for numeric literal 42', () => {
    const initializer = getPropertyInitializer(`class Test { static count = 42 }`, 'count')
    expect(isLiteralValue(initializer)).toBe(true)
  })

  it('returns true for boolean literal true', () => {
    const initializer = getPropertyInitializer(`class Test { static enabled = true }`, 'enabled')
    expect(isLiteralValue(initializer)).toBe(true)
  })

  it('returns true for boolean literal false', () => {
    const initializer = getPropertyInitializer(`class Test { static enabled = false }`, 'enabled')
    expect(isLiteralValue(initializer)).toBe(true)
  })

  it('returns false for enum access HttpMethod.GET', () => {
    const initializer = getPropertyInitializer(
      `enum HttpMethod { GET, POST }
       class Test { static method = HttpMethod.GET }`,
      'method',
    )
    expect(isLiteralValue(initializer)).toBe(false)
  })

  it('returns false for template literal `/api/${id}`', () => {
    const initializer = getPropertyInitializer(
      `const id = 'test';
       class Test { static route = \`/api/\${id}\` }`,
      'route',
    )
    expect(isLiteralValue(initializer)).toBe(false)
  })

  it('returns false for function call getRoute()', () => {
    const initializer = getPropertyInitializer(
      `function getRoute() { return '/orders' }
       class Test { static route = getRoute() }`,
      'route',
    )
    expect(isLiteralValue(initializer)).toBe(false)
  })

  it('returns false for variable reference routeConstant', () => {
    const initializer = getPropertyInitializer(
      `const routeConstant = '/orders';
       class Test { static route = routeConstant }`,
      'route',
    )
    expect(isLiteralValue(initializer)).toBe(false)
  })

  it('returns false for computed property expression', () => {
    const initializer = getPropertyInitializer(
      `const base = '/api';
       class Test { static route = base + '/orders' }`,
      'route',
    )
    expect(isLiteralValue(initializer)).toBe(false)
  })

  it('returns false for undefined initializer', () => {
    expect(isLiteralValue(undefined)).toBe(false)
  })
})

describe('extractLiteralValue', () => {
  it("returns { kind: 'string', value: 'POST' } for string literal property initializer", () => {
    const initializer = getPropertyInitializer(`class Test { static method = 'POST' }`, 'method')
    const result = extractLiteralValue(initializer, 'test.ts', 1)
    expect(result.kind).toBe('string')
    expect(result.value).toBe('POST')
  })

  it("returns { kind: 'number', value: 42 } for numeric literal", () => {
    const initializer = getPropertyInitializer(`class Test { static count = 42 }`, 'count')
    const result = extractLiteralValue(initializer, 'test.ts', 1)
    expect(result.kind).toBe('number')
    expect(result.value).toBe(42)
  })

  it("returns { kind: 'boolean', value: true } for boolean true keyword", () => {
    const initializer = getPropertyInitializer(`class Test { static enabled = true }`, 'enabled')
    const result = extractLiteralValue(initializer, 'test.ts', 1)
    expect(result.kind).toBe('boolean')
    expect(result.value).toBe(true)
  })

  it("returns { kind: 'boolean', value: false } for boolean false keyword", () => {
    const initializer = getPropertyInitializer(`class Test { static enabled = false }`, 'enabled')
    const result = extractLiteralValue(initializer, 'test.ts', 1)
    expect(result.kind).toBe('boolean')
    expect(result.value).toBe(false)
  })

  it('throws ExtractionError for enum member with descriptive message', () => {
    const initializer = getPropertyInitializer(
      `enum HttpMethod { GET, POST }
       class Test { static method = HttpMethod.GET }`,
      'method',
    )

    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(ExtractionError)
    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(
      'Non-literal value detected',
    )
  })

  it('throws ExtractionError for template literal with location', () => {
    const initializer = getPropertyInitializer(
      `const id = 'test';
       class Test { static route = \`/api/\${id}\` }`,
      'route',
    )

    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(ExtractionError)
    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(
      'Non-literal value detected',
    )
  })

  it('throws ExtractionError for function call with location', () => {
    const initializer = getPropertyInitializer(
      `function getRoute() { return '/orders' }
       class Test { static route = getRoute() }`,
      'route',
    )

    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(ExtractionError)
    expect(() => extractLiteralValue(initializer, 'test.ts', 2)).toThrow(
      'Non-literal value detected',
    )
  })

  it('throws ExtractionError when initializer is undefined', () => {
    expect(() => extractLiteralValue(undefined, 'test.ts', 1)).toThrow(ExtractionError)
    expect(() => extractLiteralValue(undefined, 'test.ts', 1)).toThrow('No initializer found')
  })

  it('includes file and line in error location', () => {
    const initializer = getPropertyInitializer(
      `const x = 1;
       class Test { static route = x }`,
      'route',
    )

    const thrownError = captureExtractionError(() =>
      extractLiteralValue(initializer, 'src/api/controller.ts', 42),
    )

    expect(thrownError.location.file).toBe('src/api/controller.ts')
    expect(thrownError.location.line).toBe(42)
  })
})

function captureExtractionError(fn: () => unknown): ExtractionError {
  try {
    fn()
  } catch (error) {
    if (error instanceof ExtractionError) {
      return error
    }
  }
  throw new TestFixtureError('Expected ExtractionError to be thrown')
}
