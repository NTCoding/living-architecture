import {
  describe, it, expect 
} from 'vitest'
import {
  Project, SyntaxKind 
} from 'ts-morph'
import {
  getCalledMethodName,
  resolveTypeThroughInterface,
  findMethodInProject,
} from './call-graph-shared'
import { ComponentIndex } from '../component-index'
import { buildComponent } from './call-graph-fixtures'

const sharedProject = new Project({ useInMemoryFileSystem: true })
const counter = { value: 0 }

function nextFile(content: string): string {
  counter.value++
  const filePath = `/src/shared-test-${counter.value}.ts`
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

describe('getCalledMethodName', () => {
  it('returns method name from property access call expression', () => {
    const file = nextFile(`
      class Foo { bar() { return this } }
      const f = new Foo()
      f.bar()
    `)
    const sourceFile = sharedProject.getSourceFileOrThrow(file)
    const callExpr = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.CallExpression)
    expect(getCalledMethodName(callExpr)).toBe('bar')
  })
})

describe('resolveTypeThroughInterface', () => {
  it('returns component directly when type is a known component', () => {
    const comp = buildComponent('OrderService', '/test.ts', 1)
    const index = new ComponentIndex([comp])

    const result = resolveTypeThroughInterface('OrderService', sharedProject, index, {
      strict: false,
      sourceFilePaths: [],
      repository: 'test-repo',
    })

    expect(result).toStrictEqual({
      component: comp,
      resolvedTypeName: undefined,
      uncertain: undefined,
    })
  })

  it('resolves interface to implementation component', () => {
    const interfaceFile = nextFile(`
      export interface SharedGateway { process(): void }
    `)
    const implFile = nextFile(`
      import { SharedGateway } from './shared-test-${counter.value - 1}'
      export class ConcreteGateway implements SharedGateway { process(): void {} }
    `)
    const comp = buildComponent('ConcreteGateway', implFile, 1)
    const index = new ComponentIndex([comp])

    const result = resolveTypeThroughInterface('SharedGateway', sharedProject, index, {
      strict: false,
      sourceFilePaths: [interfaceFile, implFile],
      repository: 'test-repo',
    })

    expect(result).toStrictEqual({
      component: comp,
      resolvedTypeName: 'ConcreteGateway',
      uncertain: undefined,
    })
  })

  it('returns uncertain when interface has no implementation', () => {
    const interfaceFile = nextFile(`
      export interface OrphanGateway { run(): void }
    `)
    const index = new ComponentIndex([])

    const result = resolveTypeThroughInterface('OrphanGateway', sharedProject, index, {
      strict: false,
      sourceFilePaths: [interfaceFile],
      repository: 'test-repo',
    })

    expect(result).toStrictEqual({
      component: undefined,
      resolvedTypeName: undefined,
      uncertain: expect.stringContaining('No implementation found for OrphanGateway'),
    })
  })

  it('returns no uncertainty when type is not defined in source files', () => {
    const index = new ComponentIndex([])

    const result = resolveTypeThroughInterface('UnknownType', sharedProject, index, {
      strict: false,
      repository: 'test-repo',
      sourceFilePaths: [],
    })

    expect(result).toStrictEqual({
      component: undefined,
      resolvedTypeName: undefined,
      uncertain: undefined,
    })
  })
})

describe('findMethodInProject', () => {
  it('finds method in matching class', () => {
    nextFile(`
      export class SearchTarget {
        execute(): void {}
      }
    `)

    const result = findMethodInProject(sharedProject, 'SearchTarget', 'execute')

    expect(result.classFound).toBe(true)
    expect(result.method).toBeDefined()
  })

  it('returns classFound true but undefined method when method does not exist', () => {
    nextFile(`
      export class NoMethodTarget {
        other(): void {}
      }
    `)

    const result = findMethodInProject(sharedProject, 'NoMethodTarget', 'missing')

    expect(result.classFound).toBe(true)
    expect(result.method).toBeUndefined()
  })

  it('returns classFound false when class does not exist', () => {
    const result = findMethodInProject(sharedProject, 'NonExistentClass', 'execute')

    expect(result.classFound).toBe(false)
    expect(result.method).toBeUndefined()
  })
})
