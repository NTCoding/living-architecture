import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import {
  existsSync, readFileSync 
} from 'node:fs'
import { expandModuleRefs } from './expand-module-refs'
import { ModuleRefNotFoundError } from '../../errors'

vi.mock('node:fs')

describe('expandModuleRefs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('config without modules array', () => {
    it('returns config unchanged when modules property is missing', () => {
      const config = { other: 'property' }
      const result = expandModuleRefs(config, '/project')
      expect(result).toStrictEqual(config)
    })

    it('returns config unchanged when modules is not an array', () => {
      const config = { modules: 'not-an-array' }
      const result = expandModuleRefs(config, '/project')
      expect(result).toStrictEqual(config)
    })

    it('returns config unchanged when config is null', () => {
      const result = expandModuleRefs(null, '/project')
      expect(result).toBeNull()
    })

    it('returns config unchanged when config is not an object', () => {
      const result = expandModuleRefs('string', '/project')
      expect(result).toBe('string')
    })
  })

  describe('$ref expansion', () => {
    it('passes through null module items unchanged', () => {
      const config = { modules: [null] }

      const result = expandModuleRefs(config, '/project')

      expect(result).toStrictEqual({ modules: [null] })
      expect(readFileSync).not.toHaveBeenCalled()
    })

    it('treats module with non-string $ref as regular module', () => {
      const moduleWithInvalidRef = { $ref: 123 }
      const config = { modules: [moduleWithInvalidRef] }

      const result = expandModuleRefs(config, '/project')

      expect(result).toStrictEqual({ modules: [moduleWithInvalidRef] })
      expect(readFileSync).not.toHaveBeenCalled()
    })

    it('passes through non-$ref modules unchanged', () => {
      const inlineModule = {
        name: 'orders',
        path: 'orders-domain/src/**/*.ts',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = { modules: [inlineModule] }

      const result = expandModuleRefs(config, '/project')

      expect(result).toStrictEqual({ modules: [inlineModule] })
      expect(readFileSync).not.toHaveBeenCalled()
    })

    it('replaces $ref with module content from referenced JSON file', () => {
      const referencedModuleContent = JSON.stringify({
        name: 'orders',
        path: 'orders-domain/src/**/*.ts',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(referencedModuleContent)

      const config = { modules: [{ $ref: './domains/orders.extraction.json' }] }

      const result = expandModuleRefs(config, '/project')

      expect(result).toStrictEqual({
        modules: [
          {
            name: 'orders',
            path: 'orders-domain/src/**/*.ts',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      })
      expect(readFileSync).toHaveBeenCalledWith('/project/domains/orders.extraction.json', 'utf-8')
    })
  })

  describe('error handling', () => {
    it('throws ModuleRefNotFoundError when referenced file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const config = { modules: [{ $ref: './missing.json' }] }

      expect(() => expandModuleRefs(config, '/project')).toThrow(ModuleRefNotFoundError)
      expect(() => expandModuleRefs(config, '/project')).toThrow(
        "Cannot resolve module reference './missing.json'. File not found: /project/missing.json",
      )
    })
  })
})
