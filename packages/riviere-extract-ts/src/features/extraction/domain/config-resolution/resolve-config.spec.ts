import {
  describe, it, expect 
} from 'vitest'
import type { ExtractionConfig } from '@living-architecture/riviere-extract-config'
import { resolveConfig } from './resolve-config'

describe('resolveConfig', () => {
  describe('modules without extends', () => {
    it('returns resolved config unchanged when no module has extends', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            domain: 'orders',
            path: 'orders',
            glob: '**',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
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

    it('includes modules pattern in resolved module', () => {
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            domain: 'orders',
            path: 'orders',
            glob: '**',
            modules: '/src/{module}/',
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

      expect(result.modules[0]?.modules).toBe('/src/{module}/')
    })
  })
})
