import { validateExtractionConfigSchema } from './validation'
import { createMutableConfig } from './validation-fixtures'

describe('extraction rules schema validation', () => {
  describe('literal extraction rule', () => {
    it('returns valid when extract block has literal with string value', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { apiType: { literal: 'REST' } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid when literal has boolean value', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { enabled: { literal: true } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when literal has empty string', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { apiType: { literal: '' } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromClassName extraction rule', () => {
    it('returns valid when fromClassName is true', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { operationName: { fromClassName: true } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid when fromClassName has transform', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { operationName: { fromClassName: { transform: { stripSuffix: 'Controller' } } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromClassName is false', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { operationName: { fromClassName: false } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromMethodName extraction rule', () => {
    it('returns valid when fromMethodName is true', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { operationName: { fromMethodName: true } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromMethodName is false', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { operationName: { fromMethodName: false } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromFilePath extraction rule', () => {
    it('returns valid when fromFilePath has pattern and capture', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: {
          domain: {
            fromFilePath: {
              pattern: 'domains/(.*?)/',
              capture: 1,
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromFilePath missing pattern', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { domain: { fromFilePath: { capture: 1 } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })

    it('returns invalid when fromFilePath missing capture', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { domain: { fromFilePath: { pattern: 'test' } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromProperty extraction rule', () => {
    it('returns valid when fromProperty has name and static kind', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.ui = {
        find: 'classes',
        where: { hasDecorator: { name: 'Page' } },
        extract: {
          route: {
            fromProperty: {
              name: 'route',
              kind: 'static',
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid when fromProperty has instance kind', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.event = {
        find: 'classes',
        where: { extendsClass: { name: 'DomainEvent' } },
        extract: {
          eventName: {
            fromProperty: {
              name: 'type',
              kind: 'instance',
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromProperty has invalid kind', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.ui = {
        find: 'classes',
        where: { hasDecorator: { name: 'Page' } },
        extract: {
          route: {
            fromProperty: {
              name: 'route',
              kind: 'invalid',
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromDecoratorArg extraction rule', () => {
    it('returns valid when fromDecoratorArg has position', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { path: { fromDecoratorArg: { position: 0 } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid when fromDecoratorArg has name', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { path: { fromDecoratorArg: { name: 'path' } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromDecoratorArg is empty', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { path: { fromDecoratorArg: {} } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromDecoratorName extraction rule', () => {
    it('returns valid when fromDecoratorName is true', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: ['Get', 'Post'] } },
        extract: { httpMethod: { fromDecoratorName: true } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid when fromDecoratorName has mapping', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: ['Get', 'Post'] } },
        extract: {
          httpMethod: {
            fromDecoratorName: {
              mapping: {
                Get: 'GET',
                Post: 'POST',
              },
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })
  })

  describe('fromGenericArg extraction rule', () => {
    it('returns valid when fromGenericArg has interface and position', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.eventHandler = {
        find: 'classes',
        where: { implementsInterface: { name: 'IEventHandler' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromGenericArg missing interface', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.eventHandler = {
        find: 'classes',
        where: { implementsInterface: { name: 'IEventHandler' } },
        extract: { subscribedEvents: { fromGenericArg: { position: 0 } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe.each([
    {
      rule: 'fromMethodSignature',
      field: 'signature',
    },
    {
      rule: 'fromConstructorParams',
      field: 'eventSchema',
    },
  ])('$rule extraction rule', ({
    rule, field 
  }) => {
    it('returns valid when true', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { [field]: { [rule]: true } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when false', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
        extract: { [field]: { [rule]: false } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })

  describe('fromParameterType extraction rule', () => {
    it('returns valid when fromParameterType has position', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.useCase = {
        find: 'methods',
        where: { hasDecorator: { name: 'Execute' } },
        extract: { inputType: { fromParameterType: { position: 0 } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when fromParameterType missing position', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.useCase = {
        find: 'methods',
        where: { hasDecorator: { name: 'Execute' } },
        extract: { inputType: { fromParameterType: {} } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })

    it('returns invalid when fromParameterType has negative position', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.useCase = {
        find: 'methods',
        where: { hasDecorator: { name: 'Execute' } },
        extract: { inputType: { fromParameterType: { position: -1 } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })
})
