import type {
  ExtractionRuleInput,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { DraftComponent } from '../component-extraction/draft-component'
import { RiviereModule } from '../riviere-module'
import { createValidatedModule } from '../../__fixtures__/test-fixtures'
import { TestFixtureError } from './literal-detection'

const sharedProject = new Project({ useInMemoryFileSystem: true })
const counter = { value: 0 }

function nextFile(path: string, content: string) {
  counter.value++
  const filePath = path.replace('.ts', `-http-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

function httpCallModule(extract: Record<string, ExtractionRuleInput>): ValidatedModule {
  return createValidatedModule({
    api: { notUsed: true },
    useCase: { notUsed: true },
    event: { notUsed: true },
    ui: { notUsed: true },
    name: 'orders',
    domain: 'orders-domain',
    path: '/src/orders',
    glob: '**',
    domainOp: { notUsed: true },
    eventHandler: { notUsed: true },
    customTypes: {
      httpCall: {
        find: 'methods',
        where: { nameEndsWith: { suffix: 'check' } },
        extract,
      },
    },
  })
}

function httpCallDraft(file: string, line: number): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'httpCall',
    name: 'check',
    location: {
      file,
      line,
    },
    domain: 'orders-domain',
    module: 'orders',
  })
}

function enrich(drafts: DraftComponent[], modules: ValidatedModule[]) {
  const [module] = modules
  if (module === undefined) {
    throw new TestFixtureError('Expected one module in test config')
  }
  return RiviereModule.build({
    configuration: module,
    project: sharedProject,
    sourceFiles: [],
    candidateDraftComponents: drafts,
  }).enrichDraftComponents()
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

    const module = createValidatedModule({
      api: { notUsed: true },
      useCase: { notUsed: true },
      event: { notUsed: true },
      ui: { notUsed: true },
      name: 'orders',
      domain: 'orders-domain',
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
    })

    const result = enrich([httpCallDraft(file, 5)], [module])

    expect(result.components[0]?.metadata).toMatchObject({ serviceName: 'Fraud Detection Service' })
    expect(result.failures).toMatchObject([])
  })

  it('extracts route and method decorator positional args with fromDecoratorArg', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function HttpCall(_: string, __: string) { return () => {} }
export class FraudClient {
  @HttpCall('/api/check', 'POST')
  check() {}
}`,
    )

    const module = httpCallModule({
      route: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 0,
        },
      },
      method: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 1,
        },
      },
    })

    const result = enrich([httpCallDraft(file, 3)], [module])

    expect(result.components[0]?.metadata).toMatchObject({
      route: '/api/check',
      method: 'POST',
    })
    expect(result.failures).toMatchObject([])
  })

  it('records failure when HttpCall method argument is missing', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `function HttpCall(_: string, __?: string) { return () => {} }
export class FraudClient {
  @HttpCall('/api/check')
  check() {}
}`,
    )

    const module = httpCallModule({
      route: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 0,
        },
      },
      method: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 1,
        },
      },
    })

    const result = enrich([httpCallDraft(file, 3)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('method')
    expect(result.components[0]?._missing).toMatchObject(['method'])
  })

  it('records failure when fromDecoratorArg decorator is missing on method', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `export class FraudClient {
  check() {}
}`,
    )

    const module = httpCallModule({
      route: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 0,
        },
      },
    })

    const result = enrich([httpCallDraft(file, 2)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('route')
    expect(result.components[0]?._missing).toMatchObject(['route'])
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

    const module = httpCallModule({
      route: {
        fromDecoratorArg: {
          decorator: 'HttpCall',
          position: 0,
        },
      },
    })

    const result = enrich([httpCallDraft(file, 3)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('route')
    expect(result.components[0]?._missing).toMatchObject(['route'])
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

    const module = httpCallModule({ decoratorName: { fromDecoratorName: true } })

    const result = enrich([httpCallDraft(file, 4)], [module])

    expect(result.components[0]?.metadata).toMatchObject({ decoratorName: 'First' })
    expect(result.failures).toMatchObject([])
  })

  it('records failure when fromDecoratorName is used on undecorated method', () => {
    const file = nextFile(
      '/src/orders/http-client.ts',
      `export class FraudClient {
  check() {}
}`,
    )

    const module = httpCallModule({ decoratorName: { fromDecoratorName: true } })

    const result = enrich([httpCallDraft(file, 2)], [module])

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.field).toBe('decoratorName')
    expect(result.components[0]?._missing).toMatchObject(['decoratorName'])
  })
})
