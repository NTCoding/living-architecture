import type {
  ComponentRule,
  ValidatedModule,
  ValidatedModuleInput,
} from '@living-architecture/riviere-extract-config'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { DraftComponent } from '../component-extraction/draft-component'
import { enrichComponents } from './enrich-components'
import { createValidatedModule } from '../../__fixtures__/test-fixtures'

const sharedProject = new Project({ useInMemoryFileSystem: true })
const counter = { value: 0 }

function nextFile(path: string, content: string) {
  counter.value++
  const filePath = path.replace('.ts', `-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

const BUILT_IN_TYPES: readonly string[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

const REQUIRED_FIELDS: Readonly<Record<string, Record<string, { literal: string }>>> = {
  api: { apiType: { literal: 'REST' } },
  domainOp: { operationName: { literal: 'operation' } },
  event: { eventName: { literal: 'Event' } },
  eventHandler: { subscribedEvents: { literal: 'Event' } },
  ui: { route: { literal: '/' } },
}

function notUsedModule(name: string, path: string): ValidatedModule {
  return createValidatedModule({
    name,
    domain: `${name}-domain`,
    path,
    glob: '**',
    api: {
      find: 'classes',
      where: { nameEndsWith: { suffix: 'Controller' } },
      extract: { apiType: { literal: 'REST' } },
    },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  })
}

function moduleWith(componentType: string, rule: ComponentRule): ValidatedModule {
  const base: ValidatedModuleInput = {
    name: 'orders',
    domain: 'orders-domain',
    path: '/src/orders',
    glob: '**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
  if (BUILT_IN_TYPES.includes(componentType)) {
    const completedRule =
      'find' in rule
        ? { ...rule, extract: { ...REQUIRED_FIELDS[componentType], ...rule.extract } }
        : rule
    return createValidatedModule({
      ...base,
      [componentType]: completedRule,
    })
  }
  if ('find' in rule) {
    return createValidatedModule({
      ...base,
      customTypes: { [componentType]: rule },
    })
  }
  throw new TypeError(
    `moduleWith: rule for custom type '${componentType}' must have a 'find' property`,
  )
}

function enrich(drafts: DraftComponent[], modules: ValidatedModule[]) {
  const [module] = modules
  if (module === undefined) {
    throw new TypeError('Expected one module in test config')
  }
  return enrichComponents(drafts, module, sharedProject)
}

function draft(type: string, name: string, file: string, line: number): DraftComponent {
  return DraftComponent.parse({
    type,
    name,
    location: {
      file,
      line,
    },
    domain: 'orders',
    module: 'orders-module',
  })
}

describe('enrichComponents', () => {
  describe('returns components with empty metadata when no extract blocks exist', () => {
    it('returns enriched components with empty metadata when detection rules have no extract blocks', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const result = enrich(
        [draft('api', 'OrderController', file, 1)],
        [notUsedModule('orders', '/src/orders/**')],
      )

      expect(result).toMatchObject({
        components: [
          {
            type: 'api',
            name: 'OrderController',
            location: {
              file,
              line: 1,
            },
            domain: 'orders',
            module: 'orders-module',
            metadata: {},
          },
        ],
        failures: [],
      })
    })

    it('returns empty results when given no draft components', () => {
      const result = enrich([], [notUsedModule('orders', '/src/orders/**')])
      expect(result).toMatchObject({
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

      expect(result.components[0]?.metadata).toMatchObject({ apiType: 'REST' })
      expect(result.failures).toMatchObject([])
    })

    it('adds fromClassName value to metadata', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { componentName: { fromClassName: true } },
      })
      const result = enrich([draft('api', 'OrderController', file, 1)], [module])

      expect(result.components[0]?.metadata).toMatchObject({ componentName: 'OrderController' })
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

      expect(result.components[0]?.metadata).toMatchObject({ moduleName: 'orders' })
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

      expect(result.failures).toMatchObject([
        {
          component: d,
          field: 'path',
          error: `Property 'nonexistent' not found on class 'OrderController' at ${file}:1`,
        },
      ])
      expect(result.components[0]?.metadata).toMatchObject({})
      expect(result.components[0]?._missing).toMatchObject(['path'])
    })

    it('records failure when unsupported rule type is used with class-based component', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const d = draft('api', 'OrderController', file, 1)
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { signature: { fromMethodSignature: true } },
      })
      const result = enrich([d], [module])

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('signature')
      expect(result.failures[0]?.error).toMatch(
        'Unsupported extraction rule type for class-based component',
      )
      expect(result.components[0]?._missing).toMatchObject(['signature'])
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

      expect(result.components[0]?.metadata).toMatchObject({ apiType: 'REST' })
      expect(result.components[0]?._missing).toMatchObject(['path'])
      expect(result.failures).toHaveLength(1)
    })

    it('does not record failure when api route and method properties are missing', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const d = draft('api', 'OrderController', file, 1)
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: {
          apiType: { literal: 'REST' },
          route: {
            fromProperty: {
              name: 'route',
              kind: 'instance',
            },
          },
          method: {
            fromProperty: {
              name: 'method',
              kind: 'instance',
            },
          },
        },
      })

      const result = enrich([d], [module])

      expect(result.components[0]?.metadata).toMatchObject({ apiType: 'REST' })
      expect(result.components[0]?._missing).toBeUndefined()
      expect(result.failures).toMatchObject([])
    })

    it('still records failure when api route extraction uses an invalid rule', () => {
      const file = nextFile('/src/orders/order.controller.ts', 'export class OrderController {}')
      const d = draft('api', 'OrderController', file, 1)
      const module = moduleWith('api', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Controller' } },
        extract: { route: { fromMethodSignature: true } },
      })

      const result = enrich([d], [module])

      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.field).toBe('route')
      expect(result.components[0]?._missing).toMatchObject(['route'])
    })
  })

  describe('handles notUsed and customTypes', () => {
    it('returns empty metadata when component type rule is notUsed', () => {
      const file = nextFile('/src/orders/order.service.ts', 'export class OrderService {}')
      const result = enrich(
        [draft('useCase', 'OrderService', file, 1)],
        [notUsedModule('orders', '/src/orders/**')],
      )
      expect(result.components[0]?.metadata).toMatchObject({})
    })

    it('enriches component from customTypes detection rule', () => {
      const file = nextFile('/src/orders/order.saga.ts', 'export class OrderSaga {}')
      const module = moduleWith('saga', {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Saga' } },
        extract: {
          sagaType: { literal: 'orchestrator' },
        },
      })
      const result = enrich([draft('saga', 'OrderSaga', file, 1)], [module])

      expect(result.components[0]?.metadata).toMatchObject({ sagaType: 'orchestrator' })
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

      expect(result.components[0]?.metadata).toMatchObject({ publishedEventType: 'OrderPlaced' })
      expect(result.failures).toMatchObject([])
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

      expect(result.components[0]?.metadata).toMatchObject({ publishedEventType: 'OrderPlaced' })
    })

    it('returns unknown when parameter has no type annotation', () => {
      const file = nextFile('/src/orders/publisher.ts', 'class Pub {\n  publish(event): void {}\n}')
      const module = moduleWith('eventPublisher', {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Pub' } },
        extract: { publishedEventType: { fromParameterType: { position: 0 } } },
      })
      const result = enrich([draft('eventPublisher', 'publish', file, 2)], [module])

      expect(result.components[0]?.metadata).toMatchObject({ publishedEventType: 'unknown' })
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
      expect(result.components[0]?._missing).toMatchObject(['publishedEventType'])
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
      expect(result.components[0]?._missing).toMatchObject(['componentName'])
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
      expect(result.components[0]?._missing).toMatchObject(['componentName'])
    })
  })
})
