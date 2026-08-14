import {
  validateExtractionConfig,
  validateExtractionConfigSchema,
  createMinimalConfig,
  createMinimalModule,
  createModuleWithoutPath,
  createModuleWithoutApi,
  createMutableConfig,
} from './__fixtures__/validation-fixtures'
import type { DraftConfiguration } from './extraction-config-schema'

describe('validateExtractionConfig', () => {
  describe('valid configs', () => {
    it('returns valid=true and empty errors when config is valid', () => {
      const result = validateExtractionConfig(createMinimalConfig())
      expect(result.valid).toBe(true)
      expect(result.errors).toStrictEqual([])
    })

    it('returns valid=true when using nameEndsWith predicate', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true when using nameMatches predicate', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'classes',
        where: { nameMatches: { pattern: '^.*Controller$' } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true when using inClassWith predicate', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { inClassWith: { hasDecorator: { name: 'Controller' } } },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true when using and predicate', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: {
          and: [
            { hasDecorator: { name: 'Get' } },
            { inClassWith: { hasDecorator: { name: 'Controller' } } },
          ],
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true when using or predicate', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: { or: [{ hasDecorator: { name: 'Get' } }, { hasDecorator: { name: 'Post' } }] },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true when using nested and/or predicates', () => {
      const { config, module } = createMutableConfig()
      module.api = {
        find: 'methods',
        where: {
          and: [
            { or: [{ hasDecorator: { name: 'Get' } }, { hasDecorator: { name: 'Post' } }] },
            { inClassWith: { hasDecorator: { name: 'Controller' } } },
          ],
        },
      }
      expect(validateExtractionConfigSchema(config).valid).toBe(true)
    })

    it('returns valid=true with multiple modules', () => {
      const config: DraftConfiguration = {
        modules: [
          {
            ...createMinimalModule(),
            path: 'orders',
            glob: '**',
          },
          {
            ...createMinimalModule(),
            path: 'inventory',
            glob: '**',
          },
        ],
      }
      expect(validateExtractionConfig(config).valid).toBe(true)
    })

    it('returns valid=true when module has customTypes with detection rule', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            customTypes: {
              backgroundJob: {
                find: 'functions',
                where: { hasJSDoc: { tag: 'backgroundJob' } },
              },
            },
          },
        ],
      })
      expect(result.valid).toBe(true)
    })

    it('returns valid=true when customTypes is empty object', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            customTypes: {},
          },
        ],
      })
      expect(result.valid).toBe(true)
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

    it.each([
      ['and', { and: [{ hasDecorator: { name: 'Get' } }] }],
      ['or', { or: [{ hasDecorator: { name: 'Get' } }] }],
    ])('returns error when %s predicate has less than 2 items', (_, predicate) => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            api: {
              find: 'classes',
              where: predicate,
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

    it.each([
      ['missing find property', { where: { hasJSDoc: { tag: 'job' } } }],
      ['missing where property', { find: 'functions' }],
      [
        'invalid find value',
        {
          find: 'invalid',
          where: { hasJSDoc: { tag: 'job' } },
        },
      ],
    ])('returns error when customTypes entry has %s', (_, invalidRule) => {
      const result = validateExtractionConfig({
        modules: [
          {
            ...createMinimalModule(),
            customTypes: { job: invalidRule },
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('customTypes'))).toBe(true)
    })
  })
})
