import { assert, describe, expect, it } from 'vitest'
import {
  FromClassDecoratorArgExtractionRule,
  FromClassNameExtractionRule,
  FromConstructorParamsExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
  FromFilePathExtractionRule,
  FromGenericArgExtractionRule,
  FromMethodNameExtractionRule,
  FromMethodSignatureExtractionRule,
  FromParameterTypeExtractionRule,
  FromPropertyExtractionRule,
  LiteralExtractionRule,
} from './extraction-rule'

function requireParsedRule<T>(
  result:
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly errors: readonly string[] },
): T {
  assert(result.success)
  return result.data
}

describe('extraction rules', () => {
  it('parses every extraction rule into an explicit rule kind', () => {
    const rules = [
      requireParsedRule(LiteralExtractionRule.parse({ literal: 'REST' })),
      requireParsedRule(FromClassNameExtractionRule.parse({ fromClassName: true })),
      requireParsedRule(FromMethodNameExtractionRule.parse({ fromMethodName: true })),
      requireParsedRule(
        FromFilePathExtractionRule.parse({
          fromFilePath: { pattern: 'domains/(.*)', capture: 1 },
        }),
      ),
      requireParsedRule(
        FromPropertyExtractionRule.parse({
          fromProperty: { name: 'route', kind: 'static' },
        }),
      ),
      requireParsedRule(
        FromDecoratorArgExtractionRule.parse({ fromDecoratorArg: { position: 0 } }),
      ),
      requireParsedRule(
        FromClassDecoratorArgExtractionRule.parse({
          fromClassDecoratorArg: { decorator: 'Controller', name: 'path' },
        }),
      ),
      requireParsedRule(FromDecoratorNameExtractionRule.parse({ fromDecoratorName: true })),
      requireParsedRule(
        FromGenericArgExtractionRule.parse({
          fromGenericArg: { interface: 'Handler', position: 0 },
        }),
      ),
      requireParsedRule(FromMethodSignatureExtractionRule.parse({ fromMethodSignature: true })),
      requireParsedRule(FromConstructorParamsExtractionRule.parse({ fromConstructorParams: true })),
      requireParsedRule(
        FromParameterTypeExtractionRule.parse({ fromParameterType: { position: 1 } }),
      ),
    ]

    expect(rules.map((rule) => rule.kind)).toStrictEqual([
      'literal',
      'fromClassName',
      'fromMethodName',
      'fromFilePath',
      'fromProperty',
      'fromDecoratorArg',
      'fromClassDecoratorArg',
      'fromDecoratorName',
      'fromGenericArg',
      'fromMethodSignature',
      'fromConstructorParams',
      'fromParameterType',
    ])
  })

  it('exposes the meaning of each configured value', () => {
    const transform = { stripPrefix: 'I' }
    const className = requireParsedRule(
      FromClassNameExtractionRule.parse({ fromClassName: { transform } }),
    )
    const methodName = requireParsedRule(
      FromMethodNameExtractionRule.parse({ fromMethodName: { transform } }),
    )
    const filePath = requireParsedRule(
      FromFilePathExtractionRule.parse({
        fromFilePath: { pattern: 'domains/(.*)', capture: 1, transform },
      }),
    )
    const property = requireParsedRule(
      FromPropertyExtractionRule.parse({
        fromProperty: { name: 'route', kind: 'instance', transform },
      }),
    )
    const genericArgument = requireParsedRule(
      FromGenericArgExtractionRule.parse({
        fromGenericArg: { interface: 'Handler', position: 2, transform },
      }),
    )
    const parameterType = requireParsedRule(
      FromParameterTypeExtractionRule.parse({
        fromParameterType: { position: 3, transform },
      }),
    )

    expect({
      className: className.transform,
      methodName: methodName.transform,
      filePath: {
        pattern: filePath.pattern,
        capture: filePath.capture,
        transform: filePath.transform,
      },
      property: {
        name: property.propertyName,
        kind: property.propertyKind,
        transform: property.transform,
      },
      genericArgument: {
        interfaceName: genericArgument.interfaceName,
        position: genericArgument.position,
        transform: genericArgument.transform,
      },
      parameterType: {
        position: parameterType.position,
        transform: parameterType.transform,
      },
    }).toStrictEqual({
      className: transform,
      methodName: transform,
      filePath: { pattern: 'domains/(.*)', capture: 1, transform },
      property: { name: 'route', kind: 'instance', transform },
      genericArgument: { interfaceName: 'Handler', position: 2, transform },
      parameterType: { position: 3, transform },
    })
  })

  it('models positional and named decorator arguments without optional selectors', () => {
    const named = requireParsedRule(
      FromDecoratorArgExtractionRule.parse({
        fromDecoratorArg: {
          decorator: 'Get',
          name: 'path',
          transform: { toLowerCase: true },
        },
      }),
    )
    const positional = requireParsedRule(
      FromClassDecoratorArgExtractionRule.parse({
        fromClassDecoratorArg: {
          decorator: 'Controller',
          position: 1,
          transform: { toUpperCase: true },
        },
      }),
    )

    expect({
      named: {
        decoratorName: named.decoratorName,
        argument: named.argument,
        transform: named.transform,
      },
      positional: {
        decoratorName: positional.decoratorName,
        argument: positional.argument,
        transform: positional.transform,
      },
    }).toStrictEqual({
      named: {
        decoratorName: 'Get',
        argument: { kind: 'name', name: 'path' },
        transform: { toLowerCase: true },
      },
      positional: {
        decoratorName: 'Controller',
        argument: { kind: 'position', position: 1 },
        transform: { toUpperCase: true },
      },
    })
  })

  it('parses decorator name mappings and transforms', () => {
    const rule = requireParsedRule(
      FromDecoratorNameExtractionRule.parse({
        fromDecoratorName: {
          mapping: { Get: 'GET' },
          transform: { toLowerCase: true },
        },
      }),
    )

    expect({ mapping: rule.mapping, transform: rule.transform }).toStrictEqual({
      mapping: { Get: 'GET' },
      transform: { toLowerCase: true },
    })
  })

  it.each([
    [
      'missing decorator argument selector',
      FromDecoratorArgExtractionRule.parse({ fromDecoratorArg: { decorator: 'Get' } }),
    ],
    [
      'more than one decorator argument selector',
      FromDecoratorArgExtractionRule.parse({
        fromDecoratorArg: { position: 0, name: 'path' },
      }),
    ],
    [
      'invalid file path pattern',
      FromFilePathExtractionRule.parse({ fromFilePath: { pattern: '[', capture: 0 } }),
    ],
  ])('rejects %s', (_, result) => {
    expect(result.success).toBe(false)
  })
})
