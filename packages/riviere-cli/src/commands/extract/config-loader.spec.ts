import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import {
  existsSync, readFileSync 
} from 'node:fs'
import { createConfigLoader } from './config-loader'

vi.mock('node:fs')

describe('createConfigLoader', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('file path resolution', () => {
    it('loads config from relative file path', () => {
      const configContent = JSON.stringify({
        modules: [
          {
            name: 'base',
            path: '**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(configContent)

      const loader = createConfigLoader('/project')
      const result = loader('./shared/base.json')

      expect(result.name).toBe('base')
      expect(readFileSync).toHaveBeenCalledWith('/project/shared/base.json', 'utf-8')
    })

    it('throws error when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const loader = createConfigLoader('/project')

      expect(() => loader('./missing.json')).toThrow(
        "Cannot resolve extends reference './missing.json'",
      )
    })

    it('throws error when config content is invalid', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('null')

      const loader = createConfigLoader('/project')

      expect(() => loader('./invalid.json')).toThrow('Invalid extended config format')
    })
  })

  describe('config extraction', () => {
    it('uses first module when modules array present', () => {
      const configContent = JSON.stringify({
        modules: [
          {
            name: 'first',
            path: '**',
            api: {
              find: 'methods',
              where: { hasDecorator: { name: 'API' } },
            },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
          {
            name: 'second',
            path: '**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(configContent)

      const loader = createConfigLoader('/project')
      const result = loader('./base.json')

      expect(result.name).toBe('first')
      expect(result.api).toStrictEqual({
        find: 'methods',
        where: { hasDecorator: { name: 'API' } },
      })
    })

    it('uses top-level rules when no modules array', () => {
      const configContent = JSON.stringify({
        api: {
          find: 'methods',
          where: { hasDecorator: { name: 'API' } },
        },
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(configContent)

      const loader = createConfigLoader('/project')
      const result = loader('./base.json')

      expect(result).toStrictEqual({
        name: 'extended',
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
      })
    })

    it('defaults all rules to notUsed when no rules provided', () => {
      const configContent = JSON.stringify({})

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(configContent)

      const loader = createConfigLoader('/project')
      const result = loader('./empty.json')

      expect(result).toStrictEqual({
        name: 'extended',
        path: '**',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      })
    })
  })

  describe('package resolution', () => {
    it('throws error when package cannot be resolved', () => {
      const loader = createConfigLoader('/project')

      expect(() => loader('@nonexistent/package')).toThrow(
        "Cannot resolve package '@nonexistent/package'",
      )
    })

    it('loads config from installed package with default extraction config', () => {
      const configContent = JSON.stringify({
        api: {
          find: 'methods',
          where: { hasDecorator: { name: 'API' } },
        },
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(configContent)

      const loader = createConfigLoader('/project')
      const result = loader('@living-architecture/riviere-extract-conventions')

      expect(result.api).toStrictEqual({
        find: 'methods',
        where: { hasDecorator: { name: 'API' } },
      })
    })

    it('throws error when package exists but has no default extraction config', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const loader = createConfigLoader('/project')

      expect(() => loader('@living-architecture/riviere-extract-conventions')).toThrow(
        "does not contain 'src/default-extraction.config.json'",
      )
    })
  })
})
