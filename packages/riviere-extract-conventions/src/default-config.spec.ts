import {
  describe, it, expect 
} from 'vitest'
import {
  validateExtractionConfig,
  type ComponentRule,
} from '@living-architecture/riviere-extract-config'
import {
  loadDefaultConfig,
  getFirstModule,
  getValidatedConfig,
  TestAssertionError,
} from './default-config-fixtures'

function narrowToDetectionRule(rule: ComponentRule | undefined) {
  if (!rule) {
    throw new TestAssertionError('Expected ComponentRule, got undefined')
  }
  if (!('find' in rule)) {
    throw new TestAssertionError('Expected DetectionRule, got NotUsed')
  }
  return rule
}

function assertContainerDecorator(
  rule: ComponentRule | undefined,
  expectedDecorator: string,
): void {
  const detection = narrowToDetectionRule(rule)
  if (!('inClassWith' in detection.where)) {
    throw new TestAssertionError('Expected InClassWithPredicate')
  }
  if (!('hasDecorator' in detection.where.inClassWith)) {
    throw new TestAssertionError('Expected HasDecoratorPredicate')
  }

  expect(detection.where.inClassWith.hasDecorator).toStrictEqual({
    name: expectedDecorator,
    from: '@living-architecture/riviere-extract-conventions',
  })
}

function assertExtractionConfig(
  rule: ComponentRule | undefined,
  expectedExtract: Record<string, unknown>,
): void {
  const detection = narrowToDetectionRule(rule)
  expect(detection.extract).toStrictEqual(expectedExtract)
}

function assertDirectDecorator(rule: ComponentRule | undefined, expectedDecorator: string): void {
  const detection = narrowToDetectionRule(rule)
  if (!('hasDecorator' in detection.where)) {
    throw new TestAssertionError('Expected HasDecoratorPredicate')
  }

  expect(detection.where.hasDecorator).toStrictEqual({
    name: expectedDecorator,
    from: '@living-architecture/riviere-extract-conventions',
  })
}

describe('Default extraction config', () => {
  it('validates against extraction config schema and semantic rules', () => {
    const config = loadDefaultConfig()

    const result = validateExtractionConfig(config)

    expect(result.valid).toBe(true)
  })

  it('declares all 6 required component types and eventPublisher customType', () => {
    const config = loadDefaultConfig()
    const module = getFirstModule(config)

    const requiredKeys = [
      'name',
      'path',
      'glob',
      'api',
      'useCase',
      'domainOp',
      'event',
      'eventHandler',
      'ui',
      'customTypes',
    ]
    const moduleKeys = Object.keys(module)
    expect(moduleKeys).toStrictEqual(expect.arrayContaining(requiredKeys))
    expect(moduleKeys).toHaveLength(10)
    expect(module.customTypes).toHaveProperty('eventPublisher')
    expect(module.customTypes).toHaveProperty('httpCall')
  })

  it('configures httpCall customType extraction from HttpClient and HttpCall decorators', () => {
    const config = loadDefaultConfig()
    const module = getFirstModule(config)
    const customTypes = module.customTypes
    expect(customTypes).toBeDefined()
    expect(customTypes?.['httpCall']).toStrictEqual({
      find: 'methods',
      where: {
        and: [
          {
            hasDecorator: {
              name: 'HttpCall',
              from: '@living-architecture/riviere-extract-conventions',
            },
          },
          {
            inClassWith: {
              hasDecorator: {
                name: 'HttpClient',
                from: '@living-architecture/riviere-extract-conventions',
              },
            },
          },
        ],
      },
      extract: {
        serviceName: {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
          },
        },
        route: {
          fromDecoratorArg: {
            decorator: 'HttpCall',
            position: 0,
          },
        },
      },
    })
  })

  it.each([
    {
      componentType: 'api' as const,
      expectedFind: 'methods',
    },
    {
      componentType: 'domainOp' as const,
      expectedFind: 'methods',
    },
    {
      componentType: 'eventHandler' as const,
      expectedFind: 'methods',
    },
    {
      componentType: 'useCase' as const,
      expectedFind: 'classes',
    },
    {
      componentType: 'event' as const,
      expectedFind: 'classes',
    },
    {
      componentType: 'ui' as const,
      expectedFind: 'classes',
    },
  ])('$componentType finds $expectedFind', ({
    componentType, expectedFind 
  }) => {
    const config = loadDefaultConfig()
    const module = getFirstModule(config)

    expect(module[componentType]).toHaveProperty('find', expectedFind)
  })

  describe('Container decorators', () => {
    it.each([
      {
        componentType: 'api' as const,
        decoratorName: 'APIContainer',
      },
      {
        componentType: 'domainOp' as const,
        decoratorName: 'DomainOpContainer',
      },
      {
        componentType: 'eventHandler' as const,
        decoratorName: 'EventHandlerContainer',
      },
    ])(
      '$componentType uses inClassWith $decoratorName decorator',
      ({
        componentType, decoratorName 
      }) => {
        const config = loadDefaultConfig()
        const module = getFirstModule(config)

        assertContainerDecorator(module[componentType], decoratorName)
      },
    )
  })

  it('configures eventPublishers connection detection for the eventPublisher customType', () => {
    const config = getValidatedConfig(loadDefaultConfig())

    expect(config.connections?.eventPublishers).toStrictEqual([
      {
        fromType: 'eventPublisher',
        metadataKey: 'publishedEventType',
      },
    ])
  })

  describe('Extraction rules', () => {
    it('eventHandler extracts subscribedEvents from instance property', () => {
      const config = loadDefaultConfig()
      const module = getFirstModule(config)

      assertExtractionConfig(module.eventHandler, {
        subscribedEvents: {
          fromProperty: {
            name: 'subscribedEvents',
            kind: 'instance',
          },
        },
      })
    })
  })

  describe('Direct decorators', () => {
    it.each([
      {
        componentType: 'useCase' as const,
        decoratorName: 'UseCase',
      },
      {
        componentType: 'event' as const,
        decoratorName: 'Event',
      },
      {
        componentType: 'ui' as const,
        decoratorName: 'UI',
      },
    ])(
      '$componentType uses direct $decoratorName decorator',
      ({
        componentType, decoratorName 
      }) => {
        const config = loadDefaultConfig()
        const module = getFirstModule(config)

        assertDirectDecorator(module[componentType], decoratorName)
      },
    )
  })
})
