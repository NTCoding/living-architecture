import { validateExtractionConfig } from './validation'
import {
  createMinimalConfig, createMinimalModule 
} from './validation-fixtures'

function createMinimalConnectionPattern() {
  return {
    name: 'custom-event-publisher',
    find: 'methodCalls' as const,
    where: {
      methodName: 'publish',
      receiverType: 'EventBus',
    },
    extract: { eventName: { fromArgument: 0 } },
    linkType: 'async' as const,
  }
}

function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

function configWithPattern(patternOverrides: Record<string, unknown> = {}) {
  return {
    ...createMinimalConfig(),
    connections: {
      patterns: [
        {
          ...createMinimalConnectionPattern(),
          ...patternOverrides,
        },
      ],
    },
  }
}

describe('connection pattern schema validation', () => {
  describe('valid connection patterns', () => {
    it('returns valid when global connections has minimal pattern', () => {
      expect(validateExtractionConfig(configWithPattern()).valid).toBe(true)
    })

    it('returns valid when pattern has linkType sync', () => {
      expect(validateExtractionConfig(configWithPattern({ linkType: 'sync' })).valid).toBe(true)
    })

    it('returns valid when where clause has only methodName', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { methodName: 'emit' } })).valid,
      ).toBe(true)
    })

    it('returns valid when where clause has only receiverType', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { receiverType: 'EventBus' } })).valid,
      ).toBe(true)
    })

    it('returns valid when where clause has callerHasDecorator', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ where: { callerHasDecorator: ['Controller', 'Injectable'] } }),
        ).valid,
      ).toBe(true)
    })

    it('returns valid when where clause has calleeType with hasDecorator', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ where: { calleeType: { hasDecorator: 'Injectable' } } }),
        ).valid,
      ).toBe(true)
    })

    it('returns valid when where clause has all fields combined', () => {
      const where = {
        methodName: 'publish',
        receiverType: 'EventBus',
        callerHasDecorator: ['Controller'],
        calleeType: { hasDecorator: 'Injectable' },
      }
      expect(validateExtractionConfig(configWithPattern({ where })).valid).toBe(true)
    })

    it('returns valid when extract has fromReceiverType', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { targetType: { fromReceiverType: true } } }),
        ).valid,
      ).toBe(true)
    })

    it('returns valid when extract has fromCallerType', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { sourceType: { fromCallerType: true } } }),
        ).valid,
      ).toBe(true)
    })

    it('returns valid when pattern has no extract block', () => {
      const pattern = omit(createMinimalConnectionPattern(), 'extract')
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [pattern] },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid when multiple patterns in array', () => {
      const config = {
        ...createMinimalConfig(),
        connections: {
          patterns: [
            createMinimalConnectionPattern(),
            {
              ...createMinimalConnectionPattern(),
              name: 'nestjs-controller-to-service',
              linkType: 'sync',
            },
          ],
        },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })
  })

  describe('module-level connections', () => {
    it('returns valid when module has connections patterns', () => {
      const config = {
        modules: [
          {
            ...createMinimalModule(),
            connections: { patterns: [createMinimalConnectionPattern()] },
          },
        ],
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid when both global and module connections defined', () => {
      const config = {
        connections: { patterns: [createMinimalConnectionPattern()] },
        modules: [
          {
            ...createMinimalModule(),
            connections: {
              patterns: [
                {
                  ...createMinimalConnectionPattern(),
                  name: 'module-specific-pattern',
                },
              ],
            },
          },
        ],
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns invalid when module has invalid pattern', () => {
      const config = {
        modules: [
          {
            ...createMinimalModule(),
            connections: {
              patterns: [
                {
                  ...createMinimalConnectionPattern(),
                  find: 'invalid',
                },
              ],
            },
          },
        ],
      }
      const result = validateExtractionConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('connections'))).toBe(true)
    })
  })

  describe('invalid connection patterns', () => {
    it('returns invalid when patterns array is empty', () => {
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [] },
      }
      const result = validateExtractionConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({message: expect.stringContaining('must NOT have fewer than 1 items'),}),
        ]),
      )
    })

    it('returns error when pattern is missing name', () => {
      const pattern = omit(createMinimalConnectionPattern(), 'name')
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [pattern] },
      }
      const result = validateExtractionConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('connections'))).toBe(true)
    })

    it('returns error when pattern name is empty string', () => {
      expect(validateExtractionConfig(configWithPattern({ name: '' })).valid).toBe(false)
    })

    it('returns error when pattern is missing find', () => {
      const pattern = omit(createMinimalConnectionPattern(), 'find')
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [pattern] },
      }
      expect(validateExtractionConfig(config).valid).toBe(false)
    })

    it('returns error when find is not methodCalls', () => {
      expect(validateExtractionConfig(configWithPattern({ find: 'classes' })).valid).toBe(false)
    })

    it('returns error when pattern is missing where', () => {
      const pattern = omit(createMinimalConnectionPattern(), 'where')
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [pattern] },
      }
      expect(validateExtractionConfig(config).valid).toBe(false)
    })

    it('returns error when where clause is empty object', () => {
      expect(validateExtractionConfig(configWithPattern({ where: {} })).valid).toBe(false)
    })

    it('returns error when pattern is missing linkType', () => {
      const pattern = omit(createMinimalConnectionPattern(), 'linkType')
      const config = {
        ...createMinimalConfig(),
        connections: { patterns: [pattern] },
      }
      expect(validateExtractionConfig(config).valid).toBe(false)
    })

    it('returns error when linkType is invalid value', () => {
      expect(validateExtractionConfig(configWithPattern({ linkType: 'pubsub' })).valid).toBe(false)
    })

    it('returns error when unknown property in pattern', () => {
      expect(validateExtractionConfig(configWithPattern({ unknownProp: 'value' })).valid).toBe(
        false,
      )
    })

    it('returns error when unknown property in where clause', () => {
      const where = {
        methodName: 'publish',
        unknownFilter: 'value',
      }
      expect(validateExtractionConfig(configWithPattern({ where })).valid).toBe(false)
    })
  })

  describe('where clause validation', () => {
    it('returns error when methodName is empty string', () => {
      expect(validateExtractionConfig(configWithPattern({ where: { methodName: '' } })).valid).toBe(
        false,
      )
    })

    it('returns error when receiverType is empty string', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { receiverType: '' } })).valid,
      ).toBe(false)
    })

    it('returns error when callerHasDecorator is string instead of array', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { callerHasDecorator: 'Controller' } }))
          .valid,
      ).toBe(false)
    })

    it('returns error when callerHasDecorator is empty array', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { callerHasDecorator: [] } })).valid,
      ).toBe(false)
    })

    it('returns error when callerHasDecorator contains empty string', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { callerHasDecorator: [''] } })).valid,
      ).toBe(false)
    })

    it('returns error when calleeType hasDecorator is empty string', () => {
      expect(
        validateExtractionConfig(configWithPattern({ where: { calleeType: { hasDecorator: '' } } }))
          .valid,
      ).toBe(false)
    })
  })

  describe('extract rules validation', () => {
    it('returns error when fromArgument is negative', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { eventName: { fromArgument: -1 } } }),
        ).valid,
      ).toBe(false)
    })

    it('returns error when fromArgument is non-integer', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { eventName: { fromArgument: 1.5 } } }),
        ).valid,
      ).toBe(false)
    })

    it('returns error when fromReceiverType is false', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { targetType: { fromReceiverType: false } } }),
        ).valid,
      ).toBe(false)
    })

    it('returns error when fromCallerType is false', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { sourceType: { fromCallerType: false } } }),
        ).valid,
      ).toBe(false)
    })

    it('returns valid when fromArgument is 0 (boundary)', () => {
      expect(
        validateExtractionConfig(configWithPattern({ extract: { eventName: { fromArgument: 0 } } }))
          .valid,
      ).toBe(true)
    })

    it('returns error when fromArgument is string (type mismatch)', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { eventName: { fromArgument: '0' } } }),
        ).valid,
      ).toBe(false)
    })

    it('returns error when extract has unknown rule property', () => {
      expect(
        validateExtractionConfig(
          configWithPattern({ extract: { eventName: { unknownRule: true } } }),
        ).valid,
      ).toBe(false)
    })
  })
})
