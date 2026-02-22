import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import type {
  ResolvedExtractionConfig,
  Module,
  ComponentRule,
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

const alwaysMatch: GlobMatcher = () => true

function notUsedModule(name: string, path: string): Module {
  return {
    name,
    path,
    glob: '**',
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

function moduleWith(componentType: string, rule: ComponentRule): Module {
  const base: Module = {
    name: 'orders',
    path: '/src/orders',
    glob: '**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    eventPublisher: { notUsed: true },
    ui: { notUsed: true },
  }
  return {
    ...base,
    [componentType]: rule,
  }
}

function enrich(drafts: DraftComponent[], modules: Module[]) {
  return enrichComponents(drafts, { modules }, sharedProject, alwaysMatch, '/')
}

function draft(type: string, name: string, file: string, line: number): DraftComponent {
  return {
    type,
    name,
    location: {
      file,
      line,
    },
    domain: 'orders',
  }
}

describe('enrichComponents', () => {
  describe('returns components with empty metadata when no extract blocks exist', () => {
    it('returns enriched components with empty metadata when detection rules have no extract blocks', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const result = enrich(
        [draft('api', 'OrderController', file, 1)],
        [notUsedModule('orders', '/src/orders/**')],
      )

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
      const result = enrich([], [notUsedModule('orders', '/src/orders/**')])
      expect(result).toStrictEqual({
        components: [],
        failures: [],
      })
    })
  })

  describe('enriches component with extraction rules', () => {
    it('adds literal value to metadata', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { apiType: { literal: 'REST' } },
      })
      const result = enrich([draft('api', 'OrderController', file, 1)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ apiType: 'REST' })
      expect(result.failures).toStrictEqual([])
    })

    it('adds fromClassName value to metadata', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { componentName: { fromClassName: true } },
      })
      const result = enrich([draft('api', 'OrderController', file, 1)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ componentName: 'OrderController' })
    })

    it('adds fromFilePath value to metadata', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const module = moduleWith('api', {
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
      })
      const result = enrich([draft('api', 'OrderController', file, 1)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ moduleName: 'orders' })
    })
  })

  describe('records failure when extraction rule throws', () => {
    it('records failure when fromProperty references nonexistent property', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const d = draft('api', 'OrderController', file, 1)
      const module = moduleWith('api', {
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
      })
      const result = enrich([d], [module])

      expect(result.failures).toStrictEqual([
        {
          component: d,
          field: 'path',
          error: `Property 'nonexistent' not found on class 'OrderController' at ${file}:1`,
        },
      ])
      expect(result.components[0]?.metadata).toStrictEqual({})
      expect(result.components[0]?._missing).toStrictEqual(['path'])
    })

    it('extracts successful fields and records failed ones separately', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const module = moduleWith('api', {
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
      })
      const result = enrich([draft('api', 'OrderController', file, 1)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ apiType: 'REST' })
      expect(result.components[0]?._missing).toStrictEqual(['path'])
      expect(result.failures).toHaveLength(1)
    })
  })

  describe('handles components with no matching module', () => {
    it('returns component with empty metadata when no module matches', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const neverMatch: GlobMatcher = () => false
      const config: ResolvedExtractionConfig = {modules: [notUsedModule('other', '/src/other/**')],}
      const result = enrichComponents(
        [draft('api', 'OrderController', file, 1)],
        config,
        sharedProject,
        neverMatch,
        '/',
      )

      expect(result.components[0]?.metadata).toStrictEqual({})
      expect(result.failures).toStrictEqual([])
    })
  })

  describe('handles notUsed and customTypes', () => {
    it('returns empty metadata when component type rule is notUsed', () => {
      const file = nextFile('/src/orders/order.service.ts', 'export class OrderService {}')
      const result = enrich(
        [draft('useCase', 'OrderService', file, 1)],
        [notUsedModule('orders', '/src/orders/**')],
      )
      expect(result.components[0]?.metadata).toStrictEqual({})
    })

    it('enriches component from customTypes detection rule', () => {
      const file = nextFile('/src/orders/order.saga.ts', 'export class OrderSaga {}')
      const module: Module = {
        ...moduleWith('api', { notUsed: true }),
        customTypes: {
          saga: {
            find: 'classes',
            where: { nameEndsWith: { suffix: 'Saga' } },
            extract: { sagaType: { literal: 'orchestrator' } },
          },
        },
      }
      const result = enrich([draft('saga', 'OrderSaga', file, 1)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ sagaType: 'orchestrator' })
    })
  })

  describe('handles fromParameterType extraction', () => {
    it('extracts parameter type name from method parameter', () => {
      const file = nextFile(
        '/src/orders/publisher.ts',
        'class Pub {\n  publish(event: OrderPlaced): void {}\n}',
      )
      const module = moduleWith('eventPublisher', {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Pub' } },
        extract: { publishedEventType: { fromParameterType: { position: 0 } } },
      })
      const result = enrich([draft('eventPublisher', 'publish', file, 2)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ publishedEventType: 'OrderPlaced' })
      expect(result.failures).toStrictEqual([])
    })

    it('applies transform to extracted parameter type name', () => {
      const file = nextFile(
        '/src/orders/publisher.ts',
        'class Pub {\n  publish(event: OrderPlacedEvent): void {}\n}',
      )
      const module = moduleWith('eventPublisher', {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Pub' } },
        extract: {
          publishedEventType: {
            fromParameterType: {
              position: 0,
              transform: { stripSuffix: 'Event' },
            },
          },
        },
      })
      const result = enrich([draft('eventPublisher', 'publish', file, 2)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ publishedEventType: 'OrderPlaced' })
    })

    it('returns unknown when parameter has no type annotation', () => {
      const file = nextFile('/src/orders/publisher.ts', 'class Pub {\n  publish(event): void {}\n}')
      const module = moduleWith('eventPublisher', {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Pub' } },
        extract: { publishedEventType: { fromParameterType: { position: 0 } } },
      })
      const result = enrich([draft('eventPublisher', 'publish', file, 2)], [module])

      expect(result.components[0]?.metadata).toStrictEqual({ publishedEventType: 'unknown' })
    })

    it('records failure when parameter position is out of bounds', () => {
      const file = nextFile('/src/orders/publisher.ts', 'class Pub {\n  publish(): void {}\n}')
      const module = moduleWith('eventPublisher', {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Pub' } },
        extract: { publishedEventType: { fromParameterType: { position: 0 } } },
      })
      const result = enrich([draft('eventPublisher', 'publish', file, 2)], [module])

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('publishedEventType')
      expect(result.components[0]?._missing).toStrictEqual(['publishedEventType'])
    })
  })

  describe('handles error cases for class-based extraction', () => {
    it('records failure when source file not found in project', () => {
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { componentName: { fromClassName: true } },
      })
      const result = enrich([draft('api', 'OrderController', '/src/missing/file.ts', 1)], [module])

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('componentName')
      expect(result.components[0]?._missing).toStrictEqual(['componentName'])
    })

    it('records failure when no class found at specified line', () => {
      const file = nextFile(
        '/src/orders/order.controller.ts',
        'const x = 1\nexport class OrderController {}',
      )
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { componentName: { fromClassName: true } },
      })
      const result = enrich([draft('api', 'OrderController', file, 99)], [module])

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('componentName')
      expect(result.components[0]?._missing).toStrictEqual(['componentName'])
    })
  })
})
