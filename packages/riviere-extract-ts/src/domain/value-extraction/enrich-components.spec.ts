import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import type {
  ResolvedExtractionConfig, Module 
} from '@living-architecture/riviere-extract-config'
import type {
  DraftComponent, GlobMatcher 
} from '../component-extraction/extractor'
import { enrichComponents } from './enrich-components'

const sharedProject = new Project({ useInMemoryFileSystem: true })
const counter = { value: 0 }

function nextFile(path: string, content: string) {
  counter.value++
  const filePath = path.replace('.ts', `-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

function alwaysMatchGlob(): GlobMatcher {
  return () => true
}

function moduleWithNoExtract(name: string, path: string): Module {
  return {
    name,
    path,
    api: {
      find: 'classes',
      where: { nameEndsWith: { suffix: 'Controller' } },
    },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    eventPublisher: { notUsed: true },
    ui: { notUsed: true },
  }
}

function configWithModules(modules: Module[]): ResolvedExtractionConfig {
  return { modules }
}

function apiDraft(name: string, file: string, line: number, domain: string): DraftComponent {
  return {
    type: 'api',
    name,
    location: {
      file,
      line,
    },
    domain,
  }
}

describe('enrichComponents', () => {
  describe('returns components with empty metadata when no extract blocks exist', () => {
    it('returns enriched components with empty metadata when detection rules have no extract blocks', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const config = configWithModules([moduleWithNoExtract('orders', '/src/orders/**')])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result).toStrictEqual({
        components: [
          {
            type: 'api',
            name: 'OrderController',
            location: {
              file,
              line: 1,
            },
            domain: 'orders',
            metadata: {},
          },
        ],
        failures: [],
      })
    })

    it('returns empty results when given no draft components', () => {
      const config = configWithModules([moduleWithNoExtract('orders', '/src/orders/**')])

      const result = enrichComponents([], config, sharedProject, alwaysMatchGlob(), '/')

      expect(result).toStrictEqual({
        components: [],
        failures: [],
      })
    })
  })

  describe('enriches component with extraction rules', () => {
    it('adds literal value to metadata when extract block has literal rule', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: { apiType: { literal: 'REST' } },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({ apiType: 'REST' })
      expect(result.failures).toStrictEqual([])
    })

    it('adds fromClassName value to metadata when extract block has fromClassName rule', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: { componentName: { fromClassName: true } },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({ componentName: 'OrderController' })
    })

    it('adds fromFilePath value to metadata when extract block has fromFilePath rule', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: {
            moduleName: {
              fromFilePath: {
                pattern: '/src/([^/]+)/',
                capture: 1,
              },
            },
          },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({ moduleName: 'orders' })
    })
  })

  describe('records failure when extraction rule throws', () => {
    it('records failure and adds field to _missing when fromProperty rule references nonexistent property', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const draft = apiDraft('OrderController', file, 1, 'orders')
      const drafts: DraftComponent[] = [draft]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: {
            path: {
              fromProperty: {
                name: 'nonexistent',
                kind: 'static',
              },
            },
          },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.failures).toStrictEqual([
        {
          component: draft,
          field: 'path',
          error: `Property 'nonexistent' not found on class 'OrderController' at ${file}:1`,
        },
      ])
      expect(result.components[0]?.metadata).toStrictEqual({})
      expect(result.components[0]?._missing).toStrictEqual(['path'])
    })

    it('extracts successful fields and records failed ones separately', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: {
            apiType: { literal: 'REST' },
            path: {
              fromProperty: {
                name: 'nonexistent',
                kind: 'static',
              },
            },
          },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({ apiType: 'REST' })
      expect(result.components[0]?._missing).toStrictEqual(['path'])
      expect(result.failures).toHaveLength(1)
    })
  })

  describe('handles components with no matching module', () => {
    it('returns component with empty metadata when no module matches', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')

      const neverMatchGlob: GlobMatcher = () => false

      const drafts: DraftComponent[] = [apiDraft('OrderController', file, 1, 'orders')]

      const config = configWithModules([moduleWithNoExtract('other', '/src/other/**')])

      const result = enrichComponents(drafts, config, sharedProject, neverMatchGlob, '/')

      expect(result.components[0]?.metadata).toStrictEqual({})
      expect(result.failures).toStrictEqual([])
    })
  })

  describe('handles components with notUsed detection rule', () => {
    it('returns component with empty metadata when component type rule is notUsed', () => {
      const file = nextFile('/src/orders/order.service.ts', 'export class OrderService {}')

      const drafts: DraftComponent[] = [
        {
          type: 'useCase',
          name: 'OrderService',
          location: {
            file,
            line: 1,
          },
          domain: 'orders',
        },
      ]

      const config = configWithModules([moduleWithNoExtract('orders', '/src/orders/**')])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({})
    })
  })

  describe('handles customTypes extract blocks', () => {
    it('enriches component from customTypes detection rule extract block', () => {
      const file = nextFile('/src/orders/order.saga.ts', 'export class OrderSaga {}')

      const drafts: DraftComponent[] = [
        {
          type: 'saga',
          name: 'OrderSaga',
          location: {
            file,
            line: 1,
          },
          domain: 'orders',
        },
      ]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
        customTypes: {
          saga: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Saga' } },
            extract: { sagaType: { literal: 'orchestrator' } },
          },
        },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.components[0]?.metadata).toStrictEqual({ sagaType: 'orchestrator' })
    })
  })

  describe('handles error cases for class-based extraction', () => {
    it('records failure when source file not found in project for class-based rule', () => {
      const draft = apiDraft('OrderController', '/src/missing/file.ts', 1, 'orders')
      const drafts: DraftComponent[] = [draft]

      const module: Module = {
        name: 'orders',
        path: '/src/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: { componentName: { fromClassName: true } },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('componentName')
      expect(result.components[0]?._missing).toStrictEqual(['componentName'])
    })

    it('records failure when no class found at specified line', () => {
      const file = nextFile(
        '/src/orders/order.controller.ts',
        'const x = 1\nexport class OrderController {}',
      )

      const draft = apiDraft('OrderController', file, 99, 'orders')
      const drafts: DraftComponent[] = [draft]

      const module: Module = {
        name: 'orders',
        path: '/src/orders/**',
        api: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Controller' } },
          extract: { componentName: { fromClassName: true } },
        },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        eventPublisher: { notUsed: true },
        ui: { notUsed: true },
      }

      const config = configWithModules([module])

      const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('componentName')
      expect(result.components[0]?._missing).toStrictEqual(['componentName'])
    })
  })
})
