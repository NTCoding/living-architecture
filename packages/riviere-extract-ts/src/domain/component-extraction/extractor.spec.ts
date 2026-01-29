import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import { extractComponents } from './extractor'
import {
  createResolvedConfig,
  createOrdersUseCaseConfig,
  createConfigWithRule,
  createConfigWithCustomTypes,
} from '../../test-fixtures'

function createTestProject() {
  return new Project({ useInMemoryFileSystem: true })
}

describe('extractComponents', () => {
  it('returns empty array when no source files provided', () => {
    const project = createTestProject()
    const result = extractComponents(project, [], createResolvedConfig())
    expect(result).toStrictEqual([])
  })

  describe('edge cases', () => {
    it('returns empty array when file path not found in project', () => {
      const project = createTestProject()
      const result = extractComponents(project, ['nonexistent.ts'], createResolvedConfig())
      expect(result).toStrictEqual([])
    })

    it('returns empty array when file path does not match any module', () => {
      const project = createTestProject()
      project.createSourceFile('unmatched/file.ts', 'export class Foo {}')
      const result = extractComponents(project, ['unmatched/file.ts'], createOrdersUseCaseConfig())
      expect(result).toStrictEqual([])
    })

    it('matches module path when file path uses Windows backslashes', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders\\use-cases\\create-order.ts',
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export class CreateOrder {}
      `,
      )
      const result = extractComponents(
        project,
        ['orders\\use-cases\\create-order.ts'],
        createOrdersUseCaseConfig(),
      )
      expect(result).toStrictEqual([
        {
          type: 'useCase',
          name: 'CreateOrder',
          location: {
            file: 'orders\\use-cases\\create-order.ts',
            line: 3,
          },
          domain: 'orders',
        },
      ])
    })

    it('extracts components when source file paths are absolute and module paths are relative', () => {
      const project = createTestProject()
      const absolutePath = '/project/root/orders/use-cases/create-order.ts'
      project.createSourceFile(
        absolutePath,
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export class CreateOrder {}
      `,
      )
      const result = extractComponents(
        project,
        [absolutePath],
        createOrdersUseCaseConfig(),
        '/project/root',
      )
      expect(result).toStrictEqual([
        {
          type: 'useCase',
          name: 'CreateOrder',
          location: {
            file: absolutePath,
            line: 3,
          },
          domain: 'orders',
        },
      ])
    })

    it('returns empty when absolute file path is outside configDir', () => {
      const project = createTestProject()
      const absolutePath = '/other/project/orders/use-cases/create-order.ts'
      project.createSourceFile(
        absolutePath,
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export class CreateOrder {}
      `,
      )
      const result = extractComponents(
        project,
        [absolutePath],
        createOrdersUseCaseConfig(),
        '/project/root',
      )
      expect(result).toStrictEqual([])
    })

    it('extracts components when Windows absolute paths used with configDir', () => {
      const project = createTestProject()
      const absolutePath = 'C:\\project\\root\\orders\\use-cases\\create-order.ts'
      project.createSourceFile(
        absolutePath,
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export class CreateOrder {}
      `,
      )
      const result = extractComponents(
        project,
        [absolutePath],
        createOrdersUseCaseConfig(),
        'C:\\project\\root',
      )
      expect(result).toStrictEqual([
        {
          type: 'useCase',
          name: 'CreateOrder',
          location: {
            file: absolutePath,
            line: 3,
          },
          domain: 'orders',
        },
      ])
    })

    it('skips anonymous classes without names', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/anon.ts',
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export default class {}
      `,
      )
      const result = extractComponents(project, ['orders/anon.ts'], createOrdersUseCaseConfig())
      expect(result).toStrictEqual([])
    })
  })

  describe('method extraction', () => {
    it('extracts method as component when rule matches decorator', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/api/controller.ts',
        `
        function API() { return (target: any, key: string) => {} }
        class OrderController {
          @API
          createOrder() {}
        }
      `,
      )
      const config = createConfigWithRule('orders', 'orders/**', 'api', {
        find: 'methods',
        where: { hasDecorator: { name: 'API' } },
      })
      const result = extractComponents(project, ['orders/api/controller.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'api',
          name: 'createOrder',
          location: {
            file: 'orders/api/controller.ts',
            line: 4,
          },
          domain: 'orders',
        },
      ])
    })
  })

  describe('function extraction', () => {
    it('extracts function as component when rule matches JSDoc', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/domain/process-order.ts',
        `
        /** @domainOp */
        export function processOrder() {}
      `,
      )
      const config = createConfigWithRule('orders', 'orders/**', 'domainOp', {
        find: 'functions',
        where: { hasJSDoc: { tag: 'domainOp' } },
      })
      const result = extractComponents(project, ['orders/domain/process-order.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'domainOp',
          name: 'processOrder',
          location: {
            file: 'orders/domain/process-order.ts',
            line: 3,
          },
          domain: 'orders',
        },
      ])
    })

    it('skips anonymous exported functions without names', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/domain/anon-func.ts',
        `
        /** @domainOp */
        export default function() {}
      `,
      )
      const config = createConfigWithRule('orders', 'orders/**', 'domainOp', {
        find: 'functions',
        where: { hasJSDoc: { tag: 'domainOp' } },
      })
      const result = extractComponents(project, ['orders/domain/anon-func.ts'], config)
      expect(result).toStrictEqual([])
    })
  })

  describe('class extraction', () => {
    it('extracts class as component when rule matches decorator', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/use-cases/create-order.ts',
        `
        function UseCase() { return (target: any) => target }
        @UseCase
        export class CreateOrder {}
      `,
      )
      const result = extractComponents(
        project,
        ['orders/use-cases/create-order.ts'],
        createOrdersUseCaseConfig(),
      )
      expect(result).toStrictEqual([
        {
          type: 'useCase',
          name: 'CreateOrder',
          location: {
            file: 'orders/use-cases/create-order.ts',
            line: 3,
          },
          domain: 'orders',
        },
      ])
    })

    it('extracts class with different name and file location', () => {
      const project = createTestProject()
      project.createSourceFile(
        'shipping/handlers/ship-order.ts',
        `
        function EventHandler() { return (target: any) => target }
        @EventHandler
        export class ShipOrder {}
      `,
      )
      const config = createConfigWithRule('shipping', 'shipping/**', 'eventHandler', {
        find: 'classes',
        where: { hasDecorator: { name: 'EventHandler' } },
      })
      const result = extractComponents(project, ['shipping/handlers/ship-order.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'eventHandler',
          name: 'ShipOrder',
          location: {
            file: 'shipping/handlers/ship-order.ts',
            line: 3,
          },
          domain: 'shipping',
        },
      ])
    })
  })

  describe('custom type extraction', () => {
    it('extracts function as custom type when customTypes rule matches', () => {
      const project = createTestProject()
      project.createSourceFile(
        'shipping/jobs/tracking-update.ts',
        `
        /** @backgroundJob */
        export function runTrackingUpdate() {}
      `,
      )
      const config = createConfigWithCustomTypes('shipping', 'shipping/**', {
        backgroundJob: {
          find: 'functions',
          where: { hasJSDoc: { tag: 'backgroundJob' } },
        },
      })
      const result = extractComponents(project, ['shipping/jobs/tracking-update.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'backgroundJob',
          name: 'runTrackingUpdate',
          location: {
            file: 'shipping/jobs/tracking-update.ts',
            line: 3,
          },
          domain: 'shipping',
        },
      ])
    })

    it('extracts class as custom type when customTypes rule matches', () => {
      const project = createTestProject()
      project.createSourceFile('orders/sagas/order-saga.ts', `export class OrderSaga {}`)
      const config = createConfigWithCustomTypes('orders', 'orders/**', {
        saga: {
          find: 'classes',
          where: { nameEndsWith: { suffix: 'Saga' } },
        },
      })
      const result = extractComponents(project, ['orders/sagas/order-saga.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'saga',
          name: 'OrderSaga',
          location: {
            file: 'orders/sagas/order-saga.ts',
            line: 1,
          },
          domain: 'orders',
        },
      ])
    })

    it('extracts method as custom type when customTypes rule matches', () => {
      const project = createTestProject()
      project.createSourceFile(
        'orders/policies/policy.ts',
        `
        function Policy() { return (target: any, key: string) => {} }
        class OrderPolicies {
          @Policy
          validateOrder() {}
        }
      `,
      )
      const config = createConfigWithCustomTypes('orders', 'orders/**', {
        policy: {
          find: 'methods',
          where: { hasDecorator: { name: 'Policy' } },
        },
      })
      const result = extractComponents(project, ['orders/policies/policy.ts'], config)
      expect(result).toStrictEqual([
        {
          type: 'policy',
          name: 'validateOrder',
          location: {
            file: 'orders/policies/policy.ts',
            line: 4,
          },
          domain: 'orders',
        },
      ])
    })
  })
})
