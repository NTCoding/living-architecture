import {
  describe, it, expect 
} from 'vitest'
import {
  type ExtractionConfig,
  createMinimalConfig,
} from '@living-architecture/riviere-extract-config'
import { Project } from 'ts-morph'
import { extractComponents } from './extractor'

function createTestProject() {
  return new Project({ useInMemoryFileSystem: true })
}

describe('extractComponents', () => {
  it('returns empty array when no source files provided', () => {
    const config: ExtractionConfig = createMinimalConfig()
    const project = createTestProject()

    const result = extractComponents(project, [], config)

    expect(result).toEqual([])
  })

  describe('edge cases', () => {
    it('returns empty array when file path not found in project', () => {
      const project = createTestProject()
      const config = createMinimalConfig()

      const result = extractComponents(project, ['nonexistent.ts'], config)

      expect(result).toEqual([])
    })

    it('returns empty array when file path does not match any module', () => {
      const project = createTestProject()
      project.createSourceFile('unmatched/file.ts', 'export class Foo {}')
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: {
              find: 'classes',
              where: { hasDecorator: { name: 'UseCase' } },
            },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['unmatched/file.ts'], config)

      expect(result).toEqual([])
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: {
              find: 'classes',
              where: { hasDecorator: { name: 'UseCase' } },
            },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['orders/anon.ts'], config)

      expect(result).toEqual([])
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
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
        ],
      }

      const result = extractComponents(project, ['orders/api/controller.ts'], config)

      expect(result).toEqual([
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: {
              find: 'functions',
              where: { hasJSDoc: { tag: 'domainOp' } },
            },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['orders/domain/process-order.ts'], config)

      expect(result).toEqual([
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: {
              find: 'functions',
              where: { hasJSDoc: { tag: 'domainOp' } },
            },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['orders/domain/anon-func.ts'], config)

      expect(result).toEqual([])
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            api: { notUsed: true },
            useCase: {
              find: 'classes',
              where: { hasDecorator: { name: 'UseCase' } },
            },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: { notUsed: true },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['orders/use-cases/create-order.ts'], config)

      expect(result).toEqual([
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
      const config: ExtractionConfig = {
        modules: [
          {
            name: 'shipping',
            path: 'shipping/**',
            api: { notUsed: true },
            useCase: { notUsed: true },
            domainOp: { notUsed: true },
            event: { notUsed: true },
            eventHandler: {
              find: 'classes',
              where: { hasDecorator: { name: 'EventHandler' } },
            },
            ui: { notUsed: true },
          },
        ],
      }

      const result = extractComponents(project, ['shipping/handlers/ship-order.ts'], config)

      expect(result).toEqual([
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
})
