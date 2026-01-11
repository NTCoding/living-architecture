import {
  isValidExtractionConfig,
  validateExtractionConfig,
  parseExtractionConfig,
  formatValidationErrors,
  mapAjvErrors,
} from './validation'
import type { ExtractionConfig } from './types'
import {
  createMinimalConfig,
  createFullConfig,
  createMinimalModule,
  createModuleWithoutPath,
  createModuleWithoutApi,
  createMutableConfig,
  createResolvedConfig,
} from './validation-fixtures'

describe('isValidExtractionConfig', () => {
  it('returns true when config is minimal valid', () => {
    expect(isValidExtractionConfig(createMinimalConfig())).toBe(true)
  })

  it('returns true when using createResolvedConfig', () => {
    expect(isValidExtractionConfig(createResolvedConfig())).toBe(true)
  })

  it('returns true when config uses all component types', () => {
    expect(isValidExtractionConfig(createFullConfig())).toBe(true)
  })

  it('returns true when config includes $schema', () => {
    const config = {
      $schema: './extraction-config.schema.json',
      ...createMinimalConfig(),
    }
    expect(isValidExtractionConfig(config)).toBe(true)
  })

  it('returns false when data is null', () => {
    expect(isValidExtractionConfig(null)).toBe(false)
  })

  it('returns false when data is not an object', () => {
    expect(isValidExtractionConfig('invalid')).toBe(false)
  })

  it('returns false when modules is missing', () => {
    expect(isValidExtractionConfig({})).toBe(false)
  })

  it('returns false when modules is empty', () => {
    expect(isValidExtractionConfig({ modules: [] })).toBe(false)
  })
})

describe('validateExtractionConfig', () => {
  describe('valid configs', () => {
    it('returns valid=true and empty errors when config is valid', () => {
      const result = validateExtractionConfig(createMinimalConfig())
      expect(result.valid).toBe(true)
      expect(result.errors).toStrictEqual([])
    })

    it('returns valid=true when using nameEndsWith predicate', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when using nameMatches predicate', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { nameMatches: { pattern: '^.*Controller$' } },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when using inClassWith predicate', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { inClassWith: { hasDecorator: { name: 'Controller' } } },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when using and predicate', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: {
          and: [
            { hasDecorator: { name: 'Get' } },
            { inClassWith: { hasDecorator: { name: 'Controller' } } },
          ],
        },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when using or predicate', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { or: [{ hasDecorator: { name: 'Get' } }, { hasDecorator: { name: 'Post' } }] },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when using nested and/or predicates', () => {
      const {
        config, module 
      } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: {
          and: [
            { or: [{ hasDecorator: { name: 'Get' } }, { hasDecorator: { name: 'Post' } }] },
            { inClassWith: { hasDecorator: { name: 'Controller' } } },
          ],
        },
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true with multiple modules', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            ...createMinimalModule(),
            path: 'orders/**',
          },
          {
            ...createMinimalModule(),
            path: 'inventory/**',
          },
        ],
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })
  })

  describe('invalid configs', () => {
    it('returns error when modules array is empty', () => {
      const result = validateExtractionConfig({ modules: [] })
      expect(result.valid).toBe(false)
      expect(result.errors[0]?.path).toBe('/modules')
    })

    it('returns error when module path is missing', () => {
      const result = validateExtractionConfig({ modules: [createModuleWithoutPath()] })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0'))).toBe(true)
    })

    it('returns error when module path is empty string', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            path: '',
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0/path'))).toBe(true)
    })

    it('returns error when required component type is missing', () => {
      const result = validateExtractionConfig({ modules: [createModuleWithoutApi()] })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0'))).toBe(true)
    })

    it('returns error when find target is invalid', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'invalid',
              where: { hasDecorator: { name: 'Get' } },
            },
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0/api'))).toBe(true)
    })

    it('returns error when predicate is missing required field', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'classes',
              where: { hasDecorator: {} },
            },
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns error when decorator name is empty string', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'classes',
              where: { hasDecorator: { name: '' } },
            },
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns error when and predicate has less than 2 items', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'classes',
              where: { and: [{ hasDecorator: { name: 'Get' } }] },
            },
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns error when or predicate has less than 2 items', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'classes',
              where: { or: [{ hasDecorator: { name: 'Get' } }] },
            },
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns error when unknown property exists on module', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            unknownProp: 'value',
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns error when notUsed is false', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: { notUsed: false },
          },
        ],
      })
      expect(result.valid).toBe(false)
    })

    it('returns multiple errors when config has multiple issues', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            path: '',
            api: { find: 'invalid' },
            useCase: { notUsed: true },
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })
})

describe('formatValidationErrors', () => {
  it('returns fallback message when errors array is empty', () => {
    expect(formatValidationErrors([])).toBe('validation failed without specific errors')
  })

  it('formats single error with path and message', () => {
    const result = formatValidationErrors([
      {
        path: '/modules/0/path',
        message: 'must NOT have fewer than 1 characters',
      },
    ])
    expect(result).toBe('/modules/0/path: must NOT have fewer than 1 characters')
  })

  it('formats multiple errors with newlines', () => {
    const result = formatValidationErrors([
      {
        path: '/modules/0/path',
        message: 'must NOT have fewer than 1 characters',
      },
      {
        path: '/modules/0/api',
        message: 'must match a schema in oneOf',
      },
    ])
    expect(result).toContain('/modules/0/path:')
    expect(result).toContain('/modules/0/api:')
    expect(result.split('\n')).toHaveLength(2)
  })
})

describe('parseExtractionConfig', () => {
  it('returns config when valid', () => {
    const config = createMinimalConfig()
    expect(parseExtractionConfig(config)).toStrictEqual(config)
  })

  it('throws Error when config is invalid', () => {
    expect(() => parseExtractionConfig({})).toThrow(Error)
  })

  it('includes validation errors in thrown error message', () => {
    expect(() => parseExtractionConfig({})).toThrow(/Invalid extraction config/)
  })

  it('includes specific error paths in thrown error message', () => {
    expect(() => parseExtractionConfig({ modules: [] })).toThrow('/modules')
  })
})

describe('mapAjvErrors', () => {
  it('returns empty array when errors is null', () => {
    expect(mapAjvErrors(null)).toStrictEqual([])
  })

  it('returns empty array when errors is undefined', () => {
    expect(mapAjvErrors(undefined)).toStrictEqual([])
  })

  it('maps instancePath to path', () => {
    const result = mapAjvErrors([
      {
        instancePath: '/modules/0',
        message: 'test',
      },
    ])
    expect(result[0]?.path).toBe('/modules/0')
  })

  it('uses / as path when instancePath is empty', () => {
    const result = mapAjvErrors([
      {
        instancePath: '',
        message: 'test',
      },
    ])
    expect(result[0]?.path).toBe('/')
  })

  it('uses unknown error when message is undefined', () => {
    const result = mapAjvErrors([{ instancePath: '/test' }])
    expect(result[0]?.message).toBe('unknown error')
  })
})
