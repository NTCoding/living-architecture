import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { DomainConcept } from './domain-guide-source'
import {
  annotatedDeclarations,
  classTypePaths,
  conceptInType,
  expressionPath,
  importedDomainConcepts,
  parameterTypePaths,
  visit,
} from './typescript-invocation-support'

describe('TypeScript invocation support', () => {
  it('reads class and parameter type paths including interface properties', () => {
    const sourceFile = parseSource(`
      interface Dependencies {
        repository: Repository
        primitive: string
        ['ignored']: Service
      }
      export class Example {
        field: Service
        noType
        ['ignored']: Service
        constructor(
          private repo: Repository,
          protected policy: Policy,
          public qualified: ports.Reader,
          readonly dependencies: Dependencies,
          ordinary: Other,
          { nested }: Other,
        ) {}
      }
      export function example(dependencies: Dependencies, missing, { nested }: Other): void {}
    `)
    const exampleClass = requiredClass(sourceFile, 'Example')
    const exampleFunction = requiredFunction(sourceFile, 'example')

    expect([...classTypePaths(exampleClass, sourceFile)]).toStrictEqual([
      ['this.field', 'Service'],
      ['this.repo', 'Repository'],
      ['this.policy', 'Policy'],
      ['this.qualified', 'Reader'],
      ['this.dependencies', 'Dependencies'],
      ['this.dependencies.repository', 'Repository'],
    ])
    expect([...classTypePaths(exampleFunction, sourceFile)]).toStrictEqual([])
    expect([...parameterTypePaths(exampleFunction.parameters, sourceFile)]).toStrictEqual([
      ['dependencies', 'Dependencies'],
      ['dependencies.repository', 'Repository'],
    ])
  })

  it('resolves named package imports and nested concept types', () => {
    const sourceFile = parseSource(`
      import Default from '@example/domain-model'
      import * as namespace from '@example/domain-model'
      import { Order, Policy as RenamedPolicy, Missing } from '@example/domain-model/domain/types'
      import { Ignored } from '@example/other'
      import '@example/domain-model'
      type Result = Promise<readonly Order[]>
    `)
    const concepts = new Map<string, DomainConcept>([
      ['Order', { name: 'Order', role: 'aggregate' }],
      ['Policy', { name: 'Policy', role: 'domain-service' }],
    ])
    const imports = importedDomainConcepts(sourceFile, '@example/domain-model', concepts)
    const resultType = requiredTypeAlias(sourceFile, 'Result').type

    expect([...imports]).toStrictEqual([
      ['Order', { name: 'Order', role: 'aggregate' }],
      ['RenamedPolicy', { name: 'Policy', role: 'domain-service' }],
    ])
    expect(conceptInType(resultType, imports, 'aggregate')).toStrictEqual({
      name: 'Order',
      role: 'aggregate',
    })
    expect(conceptInType(resultType, imports, 'domain-service')).toBeUndefined()
  })

  it('finds only exported annotated classes and functions', () => {
    const sourceFile = parseSource(`
      /** @riviere-role aggregate */
      export class Order {}
      /** @riviere-role domain-service */
      export function policy(): void {}
      /** @riviere-role aggregate */
      class Hidden {}
      export class Unannotated {}
      /** @riviere-role domain-service */
      export default function (): void {}
      /** @riviere-role value-object */
      export const ignored = 1
      /** @riviere-role */
      export class MissingRoleComment {}
    `)

    expect(annotatedDeclarations([{ sourceFile }]).map((entry) => entry.name)).toStrictEqual([
      'Order',
      'policy',
    ])
  })

  it('reads supported expression paths while visiting every nested node', () => {
    const sourceFile = parseSource(`
      class Example {
        run(): void {
          service.execute()
          this.repository.load()
          this.dependencies.writer.write()
          collection[0].read()
          factory().value.read()
        }
      }
    `)
    const paths: (string | undefined)[] = []
    visit(sourceFile, (node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        paths.push(expressionPath(node.expression.expression))
      }
    })

    expect(paths).toStrictEqual([
      'service',
      'this.repository',
      'this.dependencies.writer',
      undefined,
      undefined,
    ])
  })
})

function parseSource(source: string): ts.SourceFile {
  return ts.createSourceFile('example.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function requiredClass(sourceFile: ts.SourceFile, name: string): ts.ClassDeclaration {
  const declaration = sourceFile.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === name,
  )
  if (declaration === undefined || !ts.isClassDeclaration(declaration)) return expect.fail()
  return declaration
}

function requiredFunction(sourceFile: ts.SourceFile, name: string): ts.FunctionDeclaration {
  const declaration = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  )
  if (declaration === undefined || !ts.isFunctionDeclaration(declaration)) return expect.fail()
  return declaration
}

function requiredTypeAlias(sourceFile: ts.SourceFile, name: string): ts.TypeAliasDeclaration {
  const declaration = sourceFile.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
  )
  if (declaration === undefined || !ts.isTypeAliasDeclaration(declaration)) return expect.fail()
  return declaration
}
