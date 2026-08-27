import { assert, describe, expect, it } from 'vitest'
import {
  AndPredicate,
  ExtendsClassPredicate,
  HasDecoratorPredicate,
  HasJSDocPredicate,
  ImplementsInterfacePredicate,
  InClassWithPredicate,
  NameEndsWithPredicate,
  NameMatchesPredicate,
  OrPredicate,
  type Predicate,
} from './predicate'

type PredicateParseResult =
  | { readonly success: true; readonly data: Predicate }
  | { readonly success: false; readonly errors: readonly string[] }

function requirePredicate(result: PredicateParseResult): Predicate {
  assert(result.success)
  return result.data
}

describe('parsePredicate', () => {
  it('parses each leaf predicate into its concrete value object', () => {
    const predicates = [
      requirePredicate(
        HasDecoratorPredicate.parse({
          hasDecorator: { name: ['Get', 'Post'], from: '@nestjs/common' },
        }),
      ),
      requirePredicate(HasJSDocPredicate.parse({ hasJSDoc: { tag: 'domainOp' } })),
      requirePredicate(ExtendsClassPredicate.parse({ extendsClass: { name: 'DomainEvent' } })),
      requirePredicate(
        ImplementsInterfacePredicate.parse({ implementsInterface: { name: 'Handler' } }),
      ),
      requirePredicate(NameEndsWithPredicate.parse({ nameEndsWith: { suffix: 'Controller' } })),
      requirePredicate(NameMatchesPredicate.parse({ nameMatches: { pattern: 'Controller$' } })),
    ]

    expect(predicates).toStrictEqual([
      expect.any(HasDecoratorPredicate),
      expect.any(HasJSDocPredicate),
      expect.any(ExtendsClassPredicate),
      expect.any(ImplementsInterfacePredicate),
      expect.any(NameEndsWithPredicate),
      expect.any(NameMatchesPredicate),
    ])
    expect(predicates.map((predicate) => predicate.kind)).toStrictEqual([
      'hasDecorator',
      'hasJSDoc',
      'extendsClass',
      'implementsInterface',
      'nameEndsWith',
      'nameMatches',
    ])
    expect(predicates[0]).toMatchObject({
      decoratorNames: ['Get', 'Post'],
      fromPackage: '@nestjs/common',
    })
  })

  it('normalises one decorator name into a collection', () => {
    expect(
      requirePredicate(HasDecoratorPredicate.parse({ hasDecorator: { name: 'Controller' } })),
    ).toMatchObject({
      decoratorNames: ['Controller'],
      fromPackage: undefined,
    })
  })

  it('parses nested predicates recursively', () => {
    const predicate = requirePredicate(
      AndPredicate.parse({
        and: [
          { inClassWith: { hasDecorator: { name: 'Controller' } } },
          {
            or: [{ nameEndsWith: { suffix: 'Query' } }, { nameEndsWith: { suffix: 'Command' } }],
          },
        ],
      }),
    )
    assert(predicate instanceof AndPredicate)

    expect(predicate.predicates[0]).toBeInstanceOf(InClassWithPredicate)
    expect(predicate.predicates[1]).toBeInstanceOf(OrPredicate)
  })

  it('selects every predicate kind while parsing nested predicates', () => {
    const result = AndPredicate.parse({
      and: [
        { hasDecorator: { name: 'Controller' } },
        { hasJSDoc: { tag: 'domainOp' } },
        { extendsClass: { name: 'Base' } },
        { implementsInterface: { name: 'Handler' } },
        { nameEndsWith: { suffix: 'Controller' } },
        { nameMatches: { pattern: 'Controller$' } },
        { inClassWith: { hasDecorator: { name: 'Controller' } } },
        { and: [{ hasJSDoc: { tag: 'first' } }, { hasJSDoc: { tag: 'second' } }] },
        { or: [{ hasJSDoc: { tag: 'first' } }, { hasJSDoc: { tag: 'second' } }] },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a malformed in class predicate wrapper', () => {
    expect(InClassWithPredicate.parse({}).success).toBe(false)
  })

  it.each([
    ['invalid decorator', HasDecoratorPredicate.parse({ hasDecorator: { name: [] } })],
    ['invalid JSDoc', HasJSDocPredicate.parse({ hasJSDoc: { tag: '' } })],
    ['invalid extends class', ExtendsClassPredicate.parse({ extendsClass: { name: '' } })],
    [
      'invalid interface',
      ImplementsInterfacePredicate.parse({ implementsInterface: { name: '' } }),
    ],
    ['invalid suffix', NameEndsWithPredicate.parse({ nameEndsWith: { suffix: '' } })],
    ['invalid regex', NameMatchesPredicate.parse({ nameMatches: { pattern: '[' } })],
    ['unsafe regex', NameMatchesPredicate.parse({ nameMatches: { pattern: '(a+)+$' } })],
    ['invalid nested predicate', InClassWithPredicate.parse({ inClassWith: { unknown: true } })],
    ['invalid nested value', InClassWithPredicate.parse({ inClassWith: 'predicate' })],
    [
      'several nested predicates',
      InClassWithPredicate.parse({
        inClassWith: { hasJSDoc: { tag: 'x' }, nameEndsWith: { suffix: 'x' } },
      }),
    ],
    ['too few and predicates', AndPredicate.parse({ and: [{ hasJSDoc: { tag: 'x' } }] })],
    [
      'invalid and child',
      AndPredicate.parse({ and: [{ hasJSDoc: { tag: 'x' } }, { unknown: true }] }),
    ],
    ['too few or predicates', OrPredicate.parse({ or: [{ hasJSDoc: { tag: 'x' } }] })],
    [
      'invalid or child',
      OrPredicate.parse({ or: [{ hasJSDoc: { tag: 'x' } }, { unknown: true }] }),
    ],
  ])('rejects %s', (_, result) => {
    expect(result.success).toBe(false)
  })
})
