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
  const filePath = path.replace('.ts', `-m-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

function alwaysMatchGlob(): GlobMatcher {
  return () => true
}

function configWithModules(modules: Module[]): ResolvedExtractionConfig {
  return { modules }
}

function notUsedModule(): Pick<Module, 'api' | 'useCase' | 'event' | 'eventPublisher' | 'ui'> {
  return {
    api: { notUsed: true },
    useCase: { notUsed: true },
    event: { notUsed: true },
    eventPublisher: { notUsed: true },
    ui: { notUsed: true },
  }
}

describe('enrichComponents — fromMethodName extraction', () => {
  it('extracts method name from method-based component', () => {
    const file = nextFile(
      '/src/orders/order.ops.ts',
      `export class OrderOps {
  placeOrder() {}
  cancelOrder() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'domainOp',
        name: 'placeOrder',
        location: {
          file,
          line: 2,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Order' } },
        extract: { operationName: { fromMethodName: true } },
      },
      eventHandler: { notUsed: true },
      eventPublisher: { notUsed: true },
    }

    const config = configWithModules([module])
    const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.components[0]?.metadata).toStrictEqual({ operationName: 'placeOrder' })
    expect(result.failures).toStrictEqual([])
  })

  it('records failure when no method found at specified line', () => {
    const file = nextFile(
      '/src/orders/order.ops.ts',
      `export class OrderOps {
  placeOrder() {}
}`,
    )

    const draft: DraftComponent = {
      type: 'domainOp',
      name: 'placeOrder',
      location: {
        file,
        line: 99,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Order' } },
        extract: { operationName: { fromMethodName: true } },
      },
      eventHandler: { notUsed: true },
      eventPublisher: { notUsed: true },
    }

    const config = configWithModules([module])
    const result = enrichComponents([draft], config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('operationName')
    expect(result.components[0]?._missing).toStrictEqual(['operationName'])
  })

  it('records failure when source file not found for fromMethodName', () => {
    const draft: DraftComponent = {
      type: 'domainOp',
      name: 'placeOrder',
      location: {
        file: '/src/missing/ops.ts',
        line: 2,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/**',
      domainOp: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'Order' } },
        extract: { operationName: { fromMethodName: true } },
      },
      eventHandler: { notUsed: true },
      eventPublisher: { notUsed: true },
    }

    const config = configWithModules([module])
    const result = enrichComponents([draft], config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.failures).toHaveLength(1)
    expect(result.components[0]?._missing).toStrictEqual(['operationName'])
  })
})

describe('enrichComponents — fromGenericArg extraction', () => {
  it('extracts subscribed events from generic arg on containing class', () => {
    const file = nextFile(
      '/src/orders/order.handler.ts',
      `interface IEventHandler<T> { subscribedEvents: string[] }
export class OrderHandler implements IEventHandler<OrderPlaced> {
  readonly subscribedEvents = ['OrderPlaced']
  handle() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'eventHandler',
        name: 'handle',
        location: {
          file,
          line: 4,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: { notUsed: true },
      eventHandler: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'handle' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })

  it('finds containing class when method is in second class of file', () => {
    const file = nextFile(
      '/src/orders/multi-class.handler.ts',
      `interface IEventHandler<T> { subscribedEvents: string[] }
export class UnrelatedService {
  doSomething() {}
}
export class OrderHandler implements IEventHandler<OrderPlaced> {
  readonly subscribedEvents = ['OrderPlaced']
  handle() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'eventHandler',
        name: 'handle',
        location: {
          file,
          line: 7,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: { notUsed: true },
      eventHandler: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'handle' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })

  it('records failure when no containing class found for fromGenericArg', () => {
    const file = nextFile('/src/orders/standalone.ts', 'const x = 1')

    const draft: DraftComponent = {
      type: 'eventHandler',
      name: 'handle',
      location: {
        file,
        line: 1,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: { notUsed: true },
      eventHandler: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'handle' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents([draft], config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('subscribedEvents')
    expect(result.components[0]?._missing).toStrictEqual(['subscribedEvents'])
  })

  it('records failure when source file not found for fromGenericArg', () => {
    const draft: DraftComponent = {
      type: 'eventHandler',
      name: 'handle',
      location: {
        file: '/src/missing/handler.ts',
        line: 4,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/**',
      domainOp: { notUsed: true },
      eventHandler: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'handle' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents([draft], config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.failures).toHaveLength(1)
    expect(result.components[0]?._missing).toStrictEqual(['subscribedEvents'])
  })

  it('enriches class-based component with fromGenericArg', () => {
    const file = nextFile(
      '/src/orders/order.handler.ts',
      `interface IEventHandler<T> { subscribedEvents: string[] }
export class OrderHandler implements IEventHandler<OrderPlaced> {
  readonly subscribedEvents = ['OrderPlaced']
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'eventHandler',
        name: 'OrderHandler',
        location: {
          file,
          line: 2,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders/**',
      domainOp: { notUsed: true },
      eventHandler: {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Handler' } },
        extract: {
          subscribedEvents: {
            fromGenericArg: {
              interface: 'IEventHandler',
              position: 0,
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })
})
