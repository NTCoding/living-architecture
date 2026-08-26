import { assert, describe, expect, it } from 'vitest'
import {
  ComponentTypeName,
  ConfiguredComponentDetection,
} from './component-detection'
import { ValidatedConfiguration } from './validated-configuration'

describe('ComponentTypeName', () => {
  it('accepts a meaningful component type name', () => {
    const result = ComponentTypeName.parse('scheduledJob')
    assert(result.success)
    expect(result.data.value).toBe('scheduledJob')
  })

  it.each(['', '   ', undefined])('rejects an empty component type name', (input) => {
    expect(ComponentTypeName.parse(input)).toStrictEqual({
      success: false,
      errors: ['Component type name must not be empty'],
    })
  })
})

describe('ValidatedModule.componentDetections', () => {
  it('returns configured built in and custom detections as value objects', () => {
    const result = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'orders',
          domain: 'orders',
          path: 'orders',
          glob: '**/*.ts',
          api: { notUsed: true },
          useCase: { find: 'classes', where: { nameEndsWith: { suffix: 'UseCase' } } },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
          customTypes: {
            scheduledJob: {
              find: 'methods',
              where: { hasDecorator: { name: 'Scheduled' } },
            },
          },
        },
      ],
    })
    assert(result.success)
    const module = result.data.modules[0]
    assert(module)

    const detections = module.componentDetections()

    expect(detections).toHaveLength(2)
    expect(detections.every((value) => value instanceof ConfiguredComponentDetection)).toBe(true)
    expect(detections.map((value) => value.componentType.value)).toStrictEqual([
      'useCase',
      'scheduledJob',
    ])
    expect(detections.map((value) => value.rule.find)).toStrictEqual(['classes', 'methods'])
  })

  it('rejects a custom detection without a component type name', () => {
    const result = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'orders',
          domain: 'orders',
          path: 'orders',
          glob: '**/*.ts',
          api: { notUsed: true },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
          customTypes: {
            '': { find: 'classes', where: { nameEndsWith: { suffix: 'Job' } } },
          },
        },
      ],
    })

    expect(result).toStrictEqual({
      success: false,
      errors: [
        {
          path: '/modules/0/customTypes',
          message: 'Component type name must not be empty',
        },
      ],
    })
  })
})
