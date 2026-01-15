import { validateExtractionConfigSchema } from './validation'
import { createMutableConfig } from './validation-fixtures'

describe('extraction rules schema validation - source-based rules', () => {
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

  describe('transform rules', () => {
    it('returns valid when multiple transforms applied', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: {
          operationName: {
            fromClassName: {
              transform: {
                stripSuffix: 'Controller',
                toLowerCase: true,
              },
            },
          },
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns invalid when unknown transform used', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { hasDecorator: { name: 'Controller' } },
        extract: { operationName: { fromClassName: { transform: { unknownTransform: true } } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(false)
    })
  })
})
