import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { propertyRule } from '../../__fixtures__/parsed-extraction-rule-fixtures'
import { TestFixtureError } from './literal-detection'
import { evaluateFromPropertyRule } from './evaluate-property-extraction-rule'

const project = new Project({ useInMemoryFileSystem: true })
const sourceFileNumber = { value: 0 }

function createClassDeclaration(code: string) {
  sourceFileNumber.value++
  const sourceFile = project.createSourceFile(
    `property-literal-${sourceFileNumber.value}.ts`,
    code,
  )
  const declaration = sourceFile.getClasses()[0]
  if (declaration === undefined) {
    throw new TestFixtureError('No class found in property literal test code')
  }
  return declaration
}

function evaluateProperty(input: unknown, code: string) {
  return evaluateFromPropertyRule(propertyRule(input), createClassDeclaration(code))
}

describe('property extraction literals', () => {
  it('rejects a property without an initializer', () => {
    expect(() =>
      evaluateProperty(
        { fromProperty: { name: 'route', kind: 'static' } },
        'class OrderController { static route: string }',
      ),
    ).toThrow('No initializer found')
  })

  it.each([
    ['true', true],
    ['false', false],
  ])('extracts boolean property value %s', (sourceValue, expectedValue) => {
    const result = evaluateProperty(
      { fromProperty: { name: 'enabled', kind: 'static' } },
      `class OrderController { static enabled = ${sourceValue} }`,
    )
    expect(result.value).toBe(expectedValue)
  })

  it('extracts a string array property', () => {
    const result = evaluateProperty(
      { fromProperty: { name: 'events', kind: 'static' } },
      "class Handler { static events = ['OrderPlaced', 'OrderCancelled'] }",
    )
    expect(result.value).toStrictEqual(['OrderPlaced', 'OrderCancelled'])
  })

  it('rejects an array containing non-string values', () => {
    expect(() =>
      evaluateProperty(
        { fromProperty: { name: 'events', kind: 'static' } },
        "class Handler { static events = ['OrderPlaced', 4] }",
      ),
    ).toThrow('Non-literal value detected')
  })

  it('does not apply a text transformation to a numeric value', () => {
    const result = evaluateProperty(
      {
        fromProperty: {
          name: 'port',
          kind: 'static',
          transform: { toUpperCase: true },
        },
      },
      'class OrderController { static port = 3000 }',
    )
    expect(result.value).toBe(3000)
  })
})

describe('instance property extraction', () => {
  it("extracts 'OrderPlaced' from readonly type = 'OrderPlaced'", () => {
    const result = evaluateProperty(
      {
        fromProperty: {
          name: 'type',
          kind: 'instance',
        },
      },
      "class OrderPlacedEvent { readonly type = 'OrderPlaced' }",
    )
    expect(result.value).toBe('OrderPlaced')
  })

  it('rejects a missing instance property', () => {
    expect(() =>
      evaluateProperty(
        {
          fromProperty: {
            name: 'nonexistent',
            kind: 'instance',
          },
        },
        "class OrderPlacedEvent { readonly type = 'OrderPlaced' }",
      ),
    ).toThrow('Property')
  })
})
