import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { extractComponents } from './extractor'
import { matchesGlob } from '../../../../platform/infra/external-clients/minimatch/minimatch-glob'

function createTestProject() {
  return new Project({ useInMemoryFileSystem: true })
}

function extract(project: Project, paths: string[], config: ResolvedExtractionConfig) {
  return extractComponents(project, paths, config, matchesGlob)
}

const NOT_USED = { notUsed: true } as const

function createModuleResolutionConfig(
  overrides: {
    name?: string
    domain?: string
    modules?: string
    glob?: string
  } = {},
): ResolvedExtractionConfig {
  return {
    modules: [
      {
        name: overrides.name ?? 'config-module',
        domain: overrides.domain ?? 'test-domain',
        path: '.',
        glob: overrides.glob ?? 'src/**',
        ...(overrides.modules !== undefined && { modules: overrides.modules }),
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
        api: NOT_USED,
        domainOp: NOT_USED,
        event: NOT_USED,
        eventHandler: NOT_USED,
        ui: NOT_USED,
      },
    ],
  }
}

describe('extractComponents — module resolution', () => {
  it('resolves module name from file path using {module} placeholder', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/checkout/use-cases/create-order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class CreateOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      domain: 'orders',
      modules: '/src/{module}/',
    })
    const result = extract(project, ['src/checkout/use-cases/create-order.ts'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'orders',
        module: 'checkout',
        name: 'CreateOrder',
      }),
    ])
  })

  it('falls back to config module name when modules pattern does not match file path', () => {
    const project = createTestProject()
    project.createSourceFile(
      'other/create-order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class CreateOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      name: 'fallback-name',
      domain: 'orders',
      glob: '**',
      modules: '/src/{module}/',
    })
    const result = extract(project, ['other/create-order.ts'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'orders',
        module: 'fallback-name',
        name: 'CreateOrder',
      }),
    ])
  })

  it('resolves module name when modules pattern has no trailing content after {module}', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/fulfillment/ship-order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class ShipOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      domain: 'shipping',
      modules: '/src/{module}',
    })
    const result = extract(project, ['src/fulfillment/ship-order.ts'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'shipping',
        module: 'fulfillment',
        name: 'ShipOrder',
      }),
    ])
  })

  it('uses config module name when no modules pattern is set', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/create-order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class CreateOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      name: 'my-module',
      domain: 'orders',
    })
    const result = extract(project, ['src/create-order.ts'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'orders',
        module: 'my-module',
        name: 'CreateOrder',
      }),
    ])
  })

  it('falls back to config module name when modules pattern has no {module} placeholder', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class PlaceOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      name: 'broken-pattern',
      domain: 'orders',
      modules: '/src/no-placeholder/',
    })
    const result = extract(project, ['src/order.ts'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'orders',
        module: 'broken-pattern',
      }),
    ])
  })

  it('falls back to config module name when module segment cannot be delimited', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/checkout',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class PlaceOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      name: 'no-delimiter',
      domain: 'orders',
      glob: '**',
      modules: 'src/{module}',
    })
    const result = extract(project, ['src/checkout'], config)
    expect(result).toStrictEqual([
      expect.objectContaining({
        domain: 'orders',
        module: 'no-delimiter',
      }),
    ])
  })

  it('domain and module are independent values', () => {
    const project = createTestProject()
    project.createSourceFile(
      'src/checkout/order.ts',
      `
      function UseCase() { return (target: any) => target }
      @UseCase
      export class PlaceOrder {}
    `,
    )
    const config = createModuleResolutionConfig({
      domain: 'orders',
      modules: '/src/{module}/',
    })
    const result = extract(project, ['src/checkout/order.ts'], config)
    expect(result[0]?.domain).toBe('orders')
    expect(result[0]?.module).toBe('checkout')
    expect(result[0]?.domain).not.toBe(result[0]?.module)
  })
})
