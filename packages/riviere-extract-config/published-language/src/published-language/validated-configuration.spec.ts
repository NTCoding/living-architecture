import { assert, describe, expect, it } from 'vitest'
import type { PredicateInput, ValidatedModuleInput } from './extraction-config-schema'
import { ValidatedConfiguration } from './validated-configuration'
import { ValidatedModule } from './validated-module'

const notUsed = { notUsed: true } as const
const parsedNotUsed = { kind: 'notUsed' } as const

function validModule(name: string): ValidatedModuleInput {
  return {
    name,
    domain: name,
    path: name,
    glob: '**/*.ts',
    api: notUsed,
    useCase: notUsed,
    domainOp: notUsed,
    event: notUsed,
    eventHandler: notUsed,
    ui: notUsed,
  }
}

function requireSuccessfulConfiguration(
  result: ReturnType<typeof ValidatedConfiguration.parse>,
): ValidatedConfiguration {
  assert(result.success)
  return result.data
}

describe('ValidatedConfiguration', () => {
  it('returns every validation failure', () => {
    const result = ValidatedConfiguration.parse({
      modules: [
        {
          ...validModule('orders'),
          api: {
            find: 'methods',
            where: { nameEndsWith: { suffix: 'Controller' } },
            extract: {},
          },
        },
        {
          ...validModule('shipping'),
          event: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Event' } },
            extract: {},
          },
        },
      ],
    })

    expect(result).toStrictEqual({
      success: false,
      errors: [
        expect.objectContaining({ path: '/modules/0/api' }),
        expect.objectContaining({ path: '/modules/1/event' }),
      ],
    })
  })

  it('returns a configuration containing validated modules', () => {
    const orders = {
      ...validModule('orders'),
      modules: 'src/{module}',
      customTypes: {
        eventPublisher: {
          find: 'methods' as const,
          where: { nameEndsWith: { suffix: 'Publisher' } },
          extract: {
            publishedEventType: { fromParameterType: { position: 0 } },
            targetDomain: { fromMethodName: true as const },
            targetApi: { fromClassName: true as const },
          },
        },
      },
    }
    const connections = {
      eventPublishers: [{ fromType: 'eventPublisher', metadataKey: 'publishedEventType' }],
      httpLinks: [
        {
          fromCustomType: 'eventPublisher',
          matchDomainBy: 'targetDomain',
          matchApiBy: ['targetApi'],
        },
      ],
    }
    const result = ValidatedConfiguration.parse({
      $schema: 'schema.json',
      modules: [orders],
      connections,
    })
    const configuration = requireSuccessfulConfiguration(result)
    const module = configuration.modules[0]
    assert(module)
    const eventPublisher = module.customTypes?.eventPublisher
    assert(eventPublisher)

    expect({
      isValidatedModule: module instanceof ValidatedModule,
      module: {
        name: module.name,
        domain: module.domain,
        path: module.path,
        glob: module.glob,
        modules: module.modules,
        api: module.api,
        useCase: module.useCase,
        domainOp: module.domainOp,
        event: module.event,
        eventHandler: module.eventHandler,
        ui: module.ui,
        eventPublisher: {
          find: eventPublisher.find,
          where: eventPublisher.where,
          ruleKinds: Object.fromEntries(
            Object.entries(eventPublisher.extract ?? {}).map(([field, rule]) => [field, rule.kind]),
          ),
        },
        selectedRule: module.ruleFor('api'),
      },
      connections: configuration.connections,
      schema: configuration.schema,
    }).toStrictEqual({
      isValidatedModule: true,
      module: {
        name: 'orders',
        domain: 'orders',
        path: 'orders',
        glob: '**/*.ts',
        modules: 'src/{module}',
        api: parsedNotUsed,
        useCase: parsedNotUsed,
        domainOp: parsedNotUsed,
        event: parsedNotUsed,
        eventHandler: parsedNotUsed,
        ui: parsedNotUsed,
        eventPublisher: {
          find: 'methods',
          where: expect.objectContaining({ kind: 'nameEndsWith', suffix: 'Publisher' }),
          ruleKinds: {
            publishedEventType: 'fromParameterType',
            targetDomain: 'fromMethodName',
            targetApi: 'fromClassName',
          },
        },
        selectedRule: parsedNotUsed,
      },
      connections,
      schema: 'schema.json',
    })
  })

  it('returns failures from every built-in component rule', () => {
    const missingExtraction = {
      find: 'methods' as const,
      where: { nameEndsWith: { suffix: 'Thing' } },
    }
    const result = ValidatedModule.parse({
      ...validModule('orders'),
      api: missingExtraction,
      useCase: missingExtraction,
      domainOp: missingExtraction,
      event: missingExtraction,
      eventHandler: missingExtraction,
      ui: missingExtraction,
    })

    expect(result).toStrictEqual({
      success: false,
      errors: [
        expect.objectContaining({ path: '/api' }),
        expect.objectContaining({ path: '/domainOp' }),
        expect.objectContaining({ path: '/event' }),
        expect.objectContaining({ path: '/eventHandler' }),
        expect.objectContaining({ path: '/ui' }),
      ],
    })
  })

  it('returns every invalid connection reference', () => {
    const result = ValidatedConfiguration.parse({
      modules: [
        {
          ...validModule('orders'),
          customTypes: {
            publisher: {
              find: 'methods',
              where: { nameEndsWith: { suffix: 'Publisher' } },
              extract: { available: { fromMethodName: true } },
            },
          },
        },
      ],
      connections: {
        eventPublishers: [
          { fromType: 'missing', metadataKey: 'event' },
          { fromType: 'publisher', metadataKey: 'missing' },
        ],
        httpLinks: [
          { fromCustomType: 'missing', matchDomainBy: 'domain', matchApiBy: [] },
          {
            fromCustomType: 'publisher',
            matchDomainBy: 'missingDomain',
            matchApiBy: ['available', 'missingApi'],
          },
        ],
      },
    })

    expect(result).toStrictEqual({
      success: false,
      errors: [
        expect.objectContaining({ path: '/connections/eventPublishers/0/fromType' }),
        expect.objectContaining({ path: '/connections/eventPublishers/1/metadataKey' }),
        expect.objectContaining({ path: '/connections/httpLinks/0/fromCustomType' }),
        expect.objectContaining({ path: '/connections/httpLinks/1' }),
        expect.objectContaining({ path: '/connections/httpLinks/1' }),
      ],
    })
  })

  it('accepts optional connection sections and custom types spread across modules', () => {
    const emptyConnections = ValidatedConfiguration.parse({
      modules: [validModule('orders')],
      connections: {},
    })
    const distributedCustomType = ValidatedConfiguration.parse({
      modules: [
        {
          ...validModule('orders'),
          customTypes: {
            shared: {
              find: 'methods',
              where: { nameEndsWith: { suffix: 'First' } },
            },
          },
        },
        {
          ...validModule('shipping'),
          customTypes: {
            shared: {
              find: 'methods',
              where: { nameEndsWith: { suffix: 'Second' } },
              extract: { event: { fromMethodName: true } },
            },
          },
        },
      ],
      connections: {
        eventPublishers: [{ fromType: 'shared', metadataKey: 'event' }],
      },
    })

    expect([emptyConnections.success, distributedCustomType.success]).toStrictEqual([true, true])
  })

  it('does not allow an object literal to represent a validated module', () => {
    const candidate = validModule('orders')

    // @ts-expect-error A candidate has not passed through ValidatedModule.parse.
    const validated: ValidatedModule = candidate

    expect(validated).toBe(candidate)
  })

  it('parses every extraction rule in a module into the closed rule union', () => {
    const result = ValidatedModule.parse({
      ...validModule('orders'),
      customTypes: {
        allRules: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'UseCase' } },
          extract: {
            literal: { literal: 'value' },
            className: { fromClassName: true },
            methodName: { fromMethodName: true },
            filePath: { fromFilePath: { pattern: '(.*)', capture: 1 } },
            property: { fromProperty: { name: 'value', kind: 'static' } },
            decoratorArgument: { fromDecoratorArg: { position: 0 } },
            classDecoratorArgument: {
              fromClassDecoratorArg: { decorator: 'Controller', name: 'path' },
            },
            decoratorName: { fromDecoratorName: true },
            genericArgument: { fromGenericArg: { interface: 'Handler', position: 0 } },
            methodSignature: { fromMethodSignature: true },
            constructorParameters: { fromConstructorParams: true },
            parameterType: { fromParameterType: { position: 0 } },
          },
        },
      },
    })
    assert(result.success)
    const rule = result.data.customTypes?.allRules
    assert(rule)

    expect(
      Object.values(rule.extract ?? {}).map((extractionRule) => extractionRule.kind),
    ).toStrictEqual([
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

  it('parses every predicate into the closed predicate union', () => {
    const predicates: readonly PredicateInput[] = [
      { hasDecorator: { name: 'Controller' } },
      { hasJSDoc: { tag: 'domainOp' } },
      { extendsClass: { name: 'Base' } },
      { implementsInterface: { name: 'Handler' } },
      { nameEndsWith: { suffix: 'Controller' } },
      { nameMatches: { pattern: 'Controller$' } },
      { inClassWith: { hasDecorator: { name: 'Controller' } } },
      { and: [{ hasJSDoc: { tag: 'first' } }, { hasJSDoc: { tag: 'second' } }] },
      { or: [{ hasJSDoc: { tag: 'first' } }, { hasJSDoc: { tag: 'second' } }] },
    ]

    const kinds = predicates.map((where, index) => {
      const result = ValidatedModule.parse({
        ...validModule('orders'),
        customTypes: { [`type${index}`]: { find: 'classes', where } },
      })
      assert(result.success)
      const rule = result.data.customTypes?.[`type${index}`]
      assert(rule)
      return rule.where.kind
    })

    expect(kinds).toStrictEqual([
      'hasDecorator',
      'hasJSDoc',
      'extendsClass',
      'implementsInterface',
      'nameEndsWith',
      'nameMatches',
      'inClassWith',
      'and',
      'or',
    ])
  })

  it('returns predicate parsing failures with the where path', () => {
    const result = ValidatedModule.parse({
      ...validModule('orders'),
      customTypes: {
        invalid: {
          find: 'classes',
          where: { nameMatches: { pattern: '[' } },
        },
      },
    })

    expect(result).toStrictEqual({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ path: '/customTypes/invalid/where' }),
      ]),
    })
  })

  it('returns invalid rule failures from built in and custom component rules', () => {
    const result = ValidatedModule.parse({
      ...validModule('orders'),
      useCase: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'UseCase' } },
        extract: { source: { fromFilePath: { pattern: '[', capture: 0 } } },
      },
      customTypes: {
        job: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'Job' } },
          extract: { source: { fromFilePath: { pattern: '[', capture: 0 } } },
        },
      },
    })

    expect(result).toStrictEqual({
      success: false,
      errors: [
        expect.objectContaining({ path: '/useCase/extract/source' }),
        expect.objectContaining({ path: '/customTypes/job/extract/source' }),
      ],
    })
  })
})
