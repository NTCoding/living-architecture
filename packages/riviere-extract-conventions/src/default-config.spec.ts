import {
  describe, it, expect 
} from 'vitest'
import {
  validateExtractionConfig,
  type DetectionRule,
  type InClassWithPredicate,
  type HasDecoratorPredicate,
} from '@living-architecture/riviere-extract-config'
import {
  loadDefaultConfig, getFirstModule 
} from './default-config-fixtures'

function hasProperty<T extends string>(
  obj: unknown,
  ...properties: T[]
): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && properties.every((prop) => prop in obj)
}

function isDetectionRule(rule: unknown): rule is DetectionRule {
  return hasProperty(rule, 'find', 'where')
}

function isInClassWithPredicate(predicate: unknown): predicate is InClassWithPredicate {
  return hasProperty(predicate, 'inClassWith')
}

function isHasDecoratorPredicate(predicate: unknown): predicate is HasDecoratorPredicate {
  return hasProperty(predicate, 'hasDecorator')
}

function assertContainerDecorator(rule: unknown, expectedDecorator: string): void {
  if (!isDetectionRule(rule)) {
    throw new Error('Expected DetectionRule')
  }
  if (!isInClassWithPredicate(rule.where)) {
    throw new Error('Expected InClassWithPredicate')
  }
  if (!isHasDecoratorPredicate(rule.where.inClassWith)) {
    throw new Error('Expected HasDecoratorPredicate')
  }

  expect(rule.where.inClassWith.hasDecorator).toEqual({
    name: expectedDecorator,
    from: '@living-architecture/riviere-extract-conventions',
  })
}

function assertDirectDecorator(rule: unknown, expectedDecorator: string): void {
  if (!isDetectionRule(rule)) {
    throw new Error('Expected DetectionRule')
  }
  if (!isHasDecoratorPredicate(rule.where)) {
    throw new Error('Expected HasDecoratorPredicate')
  }

  expect(rule.where.hasDecorator).toEqual({
    name: expectedDecorator,
    from: '@living-architecture/riviere-extract-conventions',
  })
}

describe('Default extraction config', () => {
  it('validates against extraction config schema', () => {
    const config = loadDefaultConfig()

    const result = validateExtractionConfig(config)

    expect(result.valid).toBe(true)
  })

  it('declares all 6 required component types', () => {
    const config = loadDefaultConfig()
    const module = getFirstModule(config)

    const requiredKeys = ['api', 'useCase', 'domainOp', 'event', 'eventHandler', 'ui']
    expect(Object.keys(module)).toEqual(expect.arrayContaining(requiredKeys))
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
