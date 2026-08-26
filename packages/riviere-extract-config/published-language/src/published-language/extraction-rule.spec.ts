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
import { ExtractionTransform } from './extraction-transform'

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

    expect([
      className.transform,
      methodName.transform,
      filePath.transform,
      property.transform,
      genericArgument.transform,
      parameterType.transform,
    ]).toStrictEqual([
      expect.any(ExtractionTransform),
      expect.any(ExtractionTransform),
      expect.any(ExtractionTransform),
      expect.any(ExtractionTransform),
      expect.any(ExtractionTransform),
      expect.any(ExtractionTransform),
    ])
    expect({
      className: className.transform?.applyTo('IOrder'),
      methodName: methodName.transform?.applyTo('IExecute'),
      filePath: {
        pattern: filePath.pattern,
        capture: filePath.capture,
        transformed: filePath.transform?.applyTo('IPath'),
      },
      property: {
        name: property.propertyName,
        kind: property.propertyKind,
        transformed: property.transform?.applyTo('IRoute'),
      },
      genericArgument: {
        interfaceName: genericArgument.interfaceName,
        position: genericArgument.position,
        transformed: genericArgument.transform?.applyTo('ICommand'),
      },
      parameterType: {
        position: parameterType.position,
        transformed: parameterType.transform?.applyTo('IRequest'),
      },
    }).toStrictEqual({
      className: 'Order',
      methodName: 'Execute',
      filePath: { pattern: 'domains/(.*)', capture: 1, transformed: 'Path' },
      property: { name: 'route', kind: 'instance', transformed: 'Route' },
      genericArgument: { interfaceName: 'Handler', position: 2, transformed: 'Command' },
      parameterType: { position: 3, transformed: 'Request' },
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
        transformed: named.transform?.applyTo('VALUE'),
      },
      positional: {
        decoratorName: positional.decoratorName,
        argument: positional.argument,
        transformed: positional.transform?.applyTo('value'),
      },
    }).toStrictEqual({
      named: {
        decoratorName: 'Get',
        argument: { kind: 'name', name: 'path' },
        transformed: 'value',
      },
      positional: {
        decoratorName: 'Controller',
        argument: { kind: 'position', position: 1 },
        transformed: 'VALUE',
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

    expect({ mapping: rule.mapping, transformed: rule.transform?.applyTo('GET') }).toStrictEqual({
      mapping: { Get: 'GET' },
      transformed: 'get',
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
    [
      'invalid transformation',
      FromClassNameExtractionRule.parse({
        fromClassName: { transform: { unknownTransform: true } },
      }),
    ],
  ])('rejects %s', (_, result) => {
    expect(result.success).toBe(false)
  })
})
