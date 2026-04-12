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
  const filePath = path.replace('.ts', `-http-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

function alwaysMatchGlob(): GlobMatcher {
  return () => true
}

function configWithModules(modules: Module[]): ResolvedExtractionConfig {
  return { modules }
}

function notUsedModule(): Pick<Module, 'api' | 'useCase' | 'event' | 'ui'> {
  return {
    api: { notUsed: true },
    useCase: { notUsed: true },
    event: { notUsed: true },
    ui: { notUsed: true },
  }
}

describe('enrichComponents — httpCall metadata extraction', () => {
  it('extracts class decorator arg for method-based custom component', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function HttpClient(_: string) { return () => {} }
function HttpCall(_: string) { return () => {} }
@HttpClient('Fraud Detection Service')
export class FraudClient {
  @HttpCall('/api/check')
  check() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'httpCall',
        name: 'check',
        location: {
          file,
          line: 5,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: {
            and: [
              { hasDecorator: { name: 'HttpCall' } },
              { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
            ],
          },
          extract: {
            serviceName: {
              fromClassDecoratorArg: {
                decorator: 'HttpClient',
                position: 0,
              },
            },
          },
        },
      },
    }

    const config = configWithModules([module])
    const result = enrichComponents(drafts, config, sharedProject, alwaysMatchGlob(), '/')

    expect(result.components[0]?.metadata).toStrictEqual({ serviceName: 'Fraud Detection Service' })
    expect(result.failures).toStrictEqual([])
  })

  it('extracts method decorator positional arg with fromDecoratorArg', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function HttpCall(_: string) { return () => {} }
export class FraudClient {
  @HttpCall('/api/check')
  check() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'httpCall',
        name: 'check',
        location: {
          file,
          line: 3,
        },
        domain: 'orders',
      },
    ]

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'check' } },
          extract: {
            route: {
              fromDecoratorArg: {
                decorator: 'HttpCall',
                position: 0,
              },
            },
          },
        },
      },
    }

    const result = enrichComponents(
      drafts,
      configWithModules([module]),
      sharedProject,
      alwaysMatchGlob(),
      '/',
    )

    expect(result.components[0]?.metadata).toStrictEqual({ route: '/api/check' })
    expect(result.failures).toStrictEqual([])
  })

  it('records failure when fromDecoratorArg decorator is missing on method', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `export class FraudClient {
  check() {}
}`,
    )

    const draft: DraftComponent = {
      type: 'httpCall',
      name: 'check',
      location: {
        file,
        line: 2,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'check' } },
          extract: {
            route: {
              fromDecoratorArg: {
                decorator: 'HttpCall',
                position: 0,
              },
            },
          },
        },
      },
    }

    const result = enrichComponents(
      [draft],
      configWithModules([module]),
      sharedProject,
      alwaysMatchGlob(),
      '/',
    )

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('route')
    expect(result.components[0]?._missing).toStrictEqual(['route'])
  })

  it('records failure when fromDecoratorArg decorator name does not match method decorator', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function OtherCall(_: string) { return () => {} }
export class FraudClient {
  @OtherCall('/api/check')
  check() {}
}`,
    )

    const draft: DraftComponent = {
      type: 'httpCall',
      name: 'check',
      location: {
        file,
        line: 3,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'check' } },
          extract: {
            route: {
              fromDecoratorArg: {
                decorator: 'HttpCall',
                position: 0,
              },
            },
          },
        },
      },
    }

    const result = enrichComponents(
      [draft],
      configWithModules([module]),
      sharedProject,
      alwaysMatchGlob(),
      '/',
    )

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('route')
    expect(result.components[0]?._missing).toStrictEqual(['route'])
  })

  it('extracts first method decorator name with fromDecoratorName', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function First() { return () => {} }
function HttpCall(_: string) { return () => {} }
export class FraudClient {
  @First()
  @HttpCall('/api/check')
  check() {}
}`,
    )

    const drafts: DraftComponent[] = [
      {
        type: 'httpCall',
        name: 'check',
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
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'check' } },
          extract: { decoratorName: { fromDecoratorName: true } },
        },
      },
    }

    const result = enrichComponents(
      drafts,
      configWithModules([module]),
      sharedProject,
      alwaysMatchGlob(),
      '/',
    )

    expect(result.components[0]?.metadata).toStrictEqual({ decoratorName: 'First' })
    expect(result.failures).toStrictEqual([])
  })

  it('records failure when fromDecoratorName is used on undecorated method', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `export class FraudClient {
  check() {}
}`,
    )

    const draft: DraftComponent = {
      type: 'httpCall',
      name: 'check',
      location: {
        file,
        line: 2,
      },
      domain: 'orders',
    }

    const module: Module = {
      ...notUsedModule(),
      name: 'orders',
      path: '/src/orders',
      glob: '**',
      domainOp: { notUsed: true },
      eventHandler: { notUsed: true },
      customTypes: {
        httpCall: {
          find: 'methods',
          where: { nameEndsWith: { suffix: 'check' } },
          extract: { decoratorName: { fromDecoratorName: true } },
        },
      },
    }

    const result = enrichComponents(
      [draft],
      configWithModules([module]),
      sharedProject,
      alwaysMatchGlob(),
      '/',
    )

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('decoratorName')
    expect(result.components[0]?._missing).toStrictEqual(['decoratorName'])
  })
})
