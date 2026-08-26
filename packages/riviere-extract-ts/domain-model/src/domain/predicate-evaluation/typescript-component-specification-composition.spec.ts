import type { PredicateInput } from '@living-architecture/riviere-extract-config-published-language'
import { Project, type Node } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { parsePredicateForTest } from '../../__fixtures__/parsed-predicate-fixture'
import { TypeScriptComponentSpecification } from './typescript-component-specification'

function createSourceFile(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  return project.createSourceFile('composition.ts', code)
}

function satisfies(node: Node, input: PredicateInput): boolean {
  return TypeScriptComponentSpecification.parse(parsePredicateForTest(input)).isSatisfiedBy(node)
}

describe('TypeScriptComponentSpecification composition', () => {
  it('requires every predicate in an and specification to match', () => {
    const sourceFile = createSourceFile(`
      function API() { return (target: any) => target }
      @API
      class OrderController {}
      @API
      class OrderService {}
    `)
    const predicate: PredicateInput = {
      and: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],
    }

    expect(satisfies(sourceFile.getClassOrThrow('OrderController'), predicate)).toBe(true)
    expect(satisfies(sourceFile.getClassOrThrow('OrderService'), predicate)).toBe(false)
  })

  it('requires at least one predicate in an or specification to match', () => {
    const sourceFile = createSourceFile(`
      class OrderController {}
      class OrderService {}
    `)
    const predicate: PredicateInput = {
      or: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],
    }

    expect(satisfies(sourceFile.getClassOrThrow('OrderController'), predicate)).toBe(true)
    expect(satisfies(sourceFile.getClassOrThrow('OrderService'), predicate)).toBe(false)
  })

  it('evaluates nested specifications recursively', () => {
    const sourceFile = createSourceFile(`
      function Get() { return (target: any, key: string) => {} }
      function Controller() { return (target: any) => target }
      @Controller
      class OrderController {
        @Get
        findAll() {}
      }
    `)
    const method = sourceFile.getClassOrThrow('OrderController').getMethodOrThrow('findAll')
    const predicate: PredicateInput = {
      and: [
        { hasDecorator: { name: 'Get' } },
        { inClassWith: { hasDecorator: { name: 'Controller' } } },
      ],
    }

    expect(satisfies(method, predicate)).toBe(true)
  })
})
