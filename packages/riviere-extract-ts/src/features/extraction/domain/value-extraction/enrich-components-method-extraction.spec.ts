import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import type {
  ResolvedExtractionConfig,
  Module,
  ComponentRule,
  ExtractBlock,
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

const alwaysMatch: GlobMatcher = () => true
const notUsed = { notUsed: true } as const

function enrich(drafts: DraftComponent[], modules: Module[]) {
  const config: ResolvedExtractionConfig = { modules }
  return enrichComponents(drafts, config, sharedProject, alwaysMatch, '/')
}

function ordersDraft(type: string, name: string, file: string, line: number): DraftComponent {
  return {
    type,
    name,
    location: {
      file,
      line,
    },
    domain: 'orders',
    module: 'orders-module',
  }
}

function ordersModule(
  path: string,
  overrides: {
    domainOp?: ComponentRule
    eventHandler?: ComponentRule
  },
): Module {
  return {
    api: notUsed,
    useCase: notUsed,
    event: notUsed,
    ui: notUsed,
    name: 'orders',
    domain: 'orders-domain',
    path,
    glob: '**',
    domainOp: overrides.domainOp ?? notUsed,
    eventHandler: overrides.eventHandler ?? notUsed,
  }
}

const domainOpMethodRule = (extract: ExtractBlock): ComponentRule => ({
  find: 'methods',
  where: { nameEndsWith: { suffix: 'Order' } },
  extract,
})

const genericArgExtract = {
  subscribedEvents: {
    fromGenericArg: {
      interface: 'IEventHandler',
      position: 0,
    },
  },
}

const eventHandlerMethodRule = (extract: ExtractBlock): ComponentRule => ({
  find: 'methods',
  where: { nameEndsWith: { suffix: 'handle' } },
  extract,
})

describe('enrichComponents — fromMethodName extraction', () => {
  it('extracts method name from method-based component', () => {
    const file = nextFile(
      '/src/orders/order.ops.ts',
      `export class OrderOps {
  placeOrder() {}
  cancelOrder() {}
}`,
    )
    const module = ordersModule('/src/orders', {domainOp: domainOpMethodRule({ operationName: { fromMethodName: true } }),})
    const result = enrich([ordersDraft('domainOp', 'placeOrder', file, 2)], [module])

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
    const module = ordersModule('/src/orders', {domainOp: domainOpMethodRule({ operationName: { fromMethodName: true } }),})
    const result = enrich([ordersDraft('domainOp', 'placeOrder', file, 99)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('operationName')
    expect(result.components[0]?._missing).toStrictEqual(['operationName'])
  })

  it('records failure when source file not found for fromMethodName', () => {
    const module = ordersModule('/src', {domainOp: domainOpMethodRule({ operationName: { fromMethodName: true } }),})
    const result = enrich(
      [ordersDraft('domainOp', 'placeOrder', '/src/missing/ops.ts', 2)],
      [module],
    )

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
    const module = ordersModule('/src/orders', {eventHandler: eventHandlerMethodRule(genericArgExtract),})
    const result = enrich([ordersDraft('eventHandler', 'handle', file, 4)], [module])

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
    const module = ordersModule('/src/orders', {eventHandler: eventHandlerMethodRule(genericArgExtract),})
    const result = enrich([ordersDraft('eventHandler', 'handle', file, 7)], [module])

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })

  it('records failure when no containing class found for fromGenericArg', () => {
    const file = nextFile('/src/orders/standalone.ts', 'const x = 1')
    const module = ordersModule('/src/orders', {eventHandler: eventHandlerMethodRule(genericArgExtract),})
    const result = enrich([ordersDraft('eventHandler', 'handle', file, 1)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('subscribedEvents')
    expect(result.components[0]?._missing).toStrictEqual(['subscribedEvents'])
  })

  it('records failure when source file not found for fromGenericArg', () => {
    const module = ordersModule('/src', { eventHandler: eventHandlerMethodRule(genericArgExtract) })
    const result = enrich(
      [ordersDraft('eventHandler', 'handle', '/src/missing/handler.ts', 4)],
      [module],
    )

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
    const module = ordersModule('/src/orders', {
      eventHandler: {
        find: 'classes',
        where: { nameEndsWith: { suffix: 'Handler' } },
        extract: genericArgExtract,
      },
    })
    const result = enrich([ordersDraft('eventHandler', 'OrderHandler', file, 2)], [module])

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })
})

describe('enrichComponents — fromProperty extraction on method-based components', () => {
  it('extracts property from containing class when component is method-based', () => {
    const file = nextFile(
      '/src/orders/order.handler.ts',
      `export class OrderHandler {
  readonly subscribedEvents = ['OrderPlaced']
  handle() {}
}`,
    )
    const module = ordersModule('/src/orders', {
      eventHandler: eventHandlerMethodRule({
        subscribedEvents: {
          fromProperty: {
            name: 'subscribedEvents',
            kind: 'instance',
          },
        },
      }),
    })
    const result = enrich([ordersDraft('eventHandler', 'handle', file, 3)], [module])

    expect(result.components[0]?.metadata).toStrictEqual({ subscribedEvents: ['OrderPlaced'] })
    expect(result.failures).toStrictEqual([])
  })
})
