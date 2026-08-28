import { Project } from 'ts-morph'
import { assert, describe, expect, it } from 'vitest'
import { buildComponent } from './__fixtures__/call-graph-fixtures'

describe('EnrichedComponent.callableReferencesIn', () => {
  it('returns no callable when the source or declaration is absent', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    project.createSourceFile('/src/present.ts', 'const value = 1')

    expect(
      [
        buildComponent('MissingFile', '/src/missing.ts', 1),
        buildComponent('MissingDeclaration', '/src/present.ts', 99),
      ].flatMap((component) => component.callableReferencesIn(project)),
    ).toStrictEqual([])
  })

  it('locates all methods owned by a class component', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/class.ts',
      'class Handler { first(): void {}\n second(): void {} }',
    )
    const declaration = sourceFile.getClassOrThrow('Handler')

    const result = buildComponent(
      'Handler',
      sourceFile.getFilePath(),
      declaration.getStartLineNumber(),
    ).callableReferencesIn(project)

    expect(result.map((callable) => callable.callableName)).toStrictEqual(['first', 'second'])
    expect(result[0]?.containerTypeName).toBe('Handler')
  })

  it('uses the component name for an anonymous class component', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/anonymous-class.ts',
      'export default class { run(): void {} }',
    )
    const declaration = sourceFile.getClasses()[0]
    assert(declaration)

    const result = buildComponent(
      'AnonymousHandler',
      sourceFile.getFilePath(),
      declaration.getStartLineNumber(),
    ).callableReferencesIn(project)

    expect(result[0]?.containerTypeName).toBe('AnonymousHandler')
  })

  it('locates a component declared on a method', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/method.ts',
      'class Handler { run(): void {} }',
    )
    const method = sourceFile.getClassOrThrow('Handler').getMethodOrThrow('run')

    const result = buildComponent(
      'Run',
      sourceFile.getFilePath(),
      method.getStartLineNumber(),
    ).callableReferencesIn(project)

    expect(result[0]).toMatchObject({
      kind: 'method',
      callableName: 'run',
      containerTypeName: 'Handler',
    })
  })

  it('locates a component declared on an anonymous class method', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/anonymous-method.ts',
      'export default class {\n run(): void {}\n}',
    )
    const method = sourceFile.getClasses()[0]?.getMethodOrThrow('run')
    assert(method)

    const result = buildComponent(
      'Run',
      sourceFile.getFilePath(),
      method.getStartLineNumber(),
    ).callableReferencesIn(project)

    expect(result[0]?.containerTypeName).toBeUndefined()
  })

  it('locates a function component', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile('/src/function.ts', 'function execute(): void {}')
    const declaration = sourceFile.getFunctionOrThrow('execute')

    const result = buildComponent(
      'Execute',
      sourceFile.getFilePath(),
      declaration.getStartLineNumber(),
    ).callableReferencesIn(project)

    expect(result[0]).toMatchObject({ kind: 'function', callableName: 'execute' })
  })
})
