import type {
  ExtractionRule,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { DraftComponent } from '../component-extraction/draft-component'
import { enrichComponents } from './enrich-components'
import { createValidatedModule } from '../../__fixtures__/test-fixtures'

const project = new Project({ useInMemoryFileSystem: true })

function nextFile(content: string): string {
  const filePath = `/src/orders/http-client-${project.getSourceFiles().length + 1}.ts`
  project.createSourceFile(filePath, content)
  return filePath
}

function createBaseModule(extract: Record<string, ExtractionRule>): ValidatedModule {
  return createValidatedModule({
    name: 'orders',
    domain: 'orders-domain',
    path: '/src/orders',
    glob: '**',
    api: {
      find: 'classes',
      where: { hasDecorator: { name: 'HttpClient' } },
      extract: { apiType: { literal: 'HTTP client' }, ...extract },
    },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  })
}

function createDraft(file: string): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'api',
    name: 'FraudClient',
    location: {
      file,
      line: 2,
    },
    domain: 'orders',
    module: 'orders-module',
  })
}

describe('enrichComponents decorator rule guidance', () => {
  it('returns guidance when fromDecoratorArg is used on class components', () => {
    const file = nextFile(
      `function HttpClient(_: string) { return () => {} }
@HttpClient('Fraud Detection Service')
export class FraudClient {}`,
    )
    const module = createBaseModule({
      serviceName: {
        fromDecoratorArg: {
          decorator: 'HttpClient',
          position: 0,
        },
      },
    })

    const result = enrichComponents([createDraft(file)], module, project)

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.error).toContain('fromDecoratorArg')
    expect(result.failures[0]?.error).toContain("Use 'fromClassDecoratorArg' for class decorators")
    expect(result.components[0]?._missing).toMatchObject(['serviceName'])
  })

  it('returns guidance when fromDecoratorName is used on class components', () => {
    const file = nextFile(
      `function HttpClient(_: string) { return () => {} }
@HttpClient('Fraud Detection Service')
export class FraudClient {}`,
    )
    const module = createBaseModule({ decoratorName: { fromDecoratorName: true } })

    const result = enrichComponents([createDraft(file)], module, project)

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.error).toContain('fromDecoratorName')
    expect(result.failures[0]?.error).toContain("Use 'fromClassDecoratorArg' for class decorators")
    expect(result.components[0]?._missing).toMatchObject(['decoratorName'])
  })

  it('preserves source-file-not-found error for fromDecoratorArg', () => {
    const missingDraft = DraftComponent.parseOrThrow({
      type: 'api',
      name: 'MissingFileComponent',
      location: {
        file: '/src/orders/missing.ts',
        line: 1,
      },
      domain: 'orders',
      module: 'orders-module',
    })
    const module = createBaseModule({
      serviceName: {
        fromDecoratorArg: {
          decorator: 'HttpClient',
          position: 0,
        },
      },
    })

    const result = enrichComponents([missingDraft], module, project)

    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.error).toContain("Source file '/src/orders/missing.ts' not found")
    expect(result.failures[0]?.error).not.toContain('requires a method component')
    expect(result.components[0]?._missing).toMatchObject(['serviceName'])
  })
})
