import {
  describe, it, expect, vi 
} from 'vitest'
import type {
  ExtractionConfig, Module 
} from '@living-architecture/riviere-extract-config'
import { resolveConfig } from './resolve-config'
import type { ConfigLoader } from './resolve-config'

describe('resolveConfig', () => {
  describe('modules without extends', () => {
    it('returns resolved config unchanged when no module has extends', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = resolveConfig(config)

      expect(result).toStrictEqual({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      })
    })

    it('throws error when module is missing required rule without extends', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      expect(() => resolveConfig(config)).toThrow(
        "Module 'orders' is missing required rule 'useCase'",
      )
    })

    it('includes customTypes in resolved module', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
            customTypes: {
              repository: {
                find: 'classes',
                where: { nameEndsWith: { suffix: 'Repository' } },
              },
            },
          },
        ],
      }

      const result = resolveConfig(config)

      expect(result.modules[0]?.customTypes).toStrictEqual({
        repository: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Repository' } },
        },
      })
    })
  })

  describe('modules with extends', () => {
    function createBaseModule(): Module {
      return {
        name: 'base',
        path: '**',
        api: {
          find: 'methods',
          where: { hasDecorator: { name: 'API' } },
        },
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      }
    }

    it('inherits rules from extended config', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(createBaseModule())

      const result = resolveConfig(config, loader)

      expect(loader).toHaveBeenCalledWith('@living-architecture/riviere-extract-conventions')
      expect(result.modules[0]).toStrictEqual({
        name: 'orders',
        path: 'orders/**',
        api: {
          find: 'methods',
          where: { hasDecorator: { name: 'API' } },
        },
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      })
    })

    it('throws error when module uses extends but no loader provided', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      }

      expect(() => resolveConfig(config)).toThrow(
        "Module 'orders' uses extends but no config loader was provided.",
      )
    })

    it('local rule overrides inherited rule', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
            api: {
              find: 'methods',
              where: { hasDecorator: { name: 'CustomAPI' } },
            },
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(createBaseModule())

      const result = resolveConfig(config, loader)

      expect(result.modules[0]?.api).toStrictEqual({
        find: 'methods',
        where: { hasDecorator: { name: 'CustomAPI' } },
      })
      expect(result.modules[0]?.useCase).toStrictEqual({
        find: 'classes',
        where: { hasDecorator: { name: 'UseCase' } },
      })
    })

    it('includes customTypes in extended module', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
            customTypes: {
              repository: {
                find: 'classes',
                where: { nameEndsWith: { suffix: 'Repository' } },
              },
            },
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(createBaseModule())

      const result = resolveConfig(config, loader)

      expect(result.modules[0]?.customTypes).toStrictEqual({
        repository: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Repository' } },
        },
      })
    })

    it('inherits customTypes from base module when local has none', () => {
      const baseWithCustomTypes: Module = {
        ...createBaseModule(),
        customTypes: {
          service: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Service' } },
          },
        },
      }

      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(baseWithCustomTypes)

      const result = resolveConfig(config, loader)

      expect(result.modules[0]?.customTypes).toStrictEqual({
        service: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Service' } },
        },
      })
    })

    it('merges customTypes from local and base module', () => {
      const baseWithCustomTypes: Module = {
        ...createBaseModule(),
        customTypes: {
          service: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Service' } },
          },
        },
      }

      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
            customTypes: {
              repository: {
                find: 'classes',
                where: { nameEndsWith: { suffix: 'Repository' } },
              },
            },
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(baseWithCustomTypes)

      const result = resolveConfig(config, loader)

      expect(result.modules[0]?.customTypes).toStrictEqual({
        service: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Service' } },
        },
        repository: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Repository' } },
        },
      })
    })

    it('local customType overrides inherited customType with same name', () => {
      const baseWithCustomTypes: Module = {
        ...createBaseModule(),
        customTypes: {
          repository: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Repo' } },
          },
        },
      }

      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
            customTypes: {
              repository: {
                find: 'classes',
                where: { nameEndsWith: { suffix: 'Repository' } },
              },
            },
          },
        ],
      }

      const loader: ConfigLoader = vi.fn().mockReturnValue(baseWithCustomTypes)

      const result = resolveConfig(config, loader)

      expect(result.modules[0]?.customTypes).toStrictEqual({
        repository: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Repository' } },
        },
      })
    })
  })
})
