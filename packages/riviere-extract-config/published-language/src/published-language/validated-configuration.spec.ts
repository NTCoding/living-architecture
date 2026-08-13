import { assert, describe, expect, it } from 'vitest'
import type { ValidatedModuleInput } from './extraction-config-schema'
import { ValidatedConfiguration, ValidatedModule } from './validated-configuration'

const notUsed = { notUsed: true } as const

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
        customTypes: module.customTypes,
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
        api: notUsed,
        useCase: notUsed,
        domainOp: notUsed,
        event: notUsed,
        eventHandler: notUsed,
        ui: notUsed,
        customTypes: orders.customTypes,
        selectedRule: notUsed,
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
})
