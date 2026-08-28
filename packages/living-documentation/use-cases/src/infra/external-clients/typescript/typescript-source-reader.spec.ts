import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'
import { TypescriptWorkspaceReadError } from './typescript-architecture-model'
import {
  compareTypescriptText,
  findTypescriptAnnotatedDeclarations,
  isTypescriptFixtureDirectory,
  readTypescriptImportedPackageNames,
  readTypescriptPackageManifestName,
  readTypescriptProductionSources,
  readTypescriptPublicMethodNames,
  toTypescriptArchitectureItem,
  typescriptAggregateOwnsEntity,
  typescriptDeclarationReferencesDeclaration,
  uniqueTypescriptArchitectureItems,
} from './typescript-source-reader'

const temporaryDirectories: string[] = []

class MissingTestDeclarationError extends Error {}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true })
})

describe('TypeScript source reader', () => {
  it('reads only sorted production TypeScript sources', () => {
    const directory = temporaryDirectory()
    for (const [file, contents] of [
      ['z.tsx', 'export const z = <div />'],
      ['a.ts', 'export const a = 1'],
      ['ignored.d.ts', 'export declare const ignored: number'],
      ['ignored.spec.ts', 'export const ignored = 1'],
      ['ignored.fixture.ts', 'export const ignored = 1'],
      ['ignored.js', 'export const ignored = 1'],
      ['__fixtures__/ignored.ts', 'export const ignored = 1'],
      ['nested/value.mts', 'export const value = 1'],
    ] as const) {
      write(directory, file, contents)
    }

    expect(readTypescriptProductionSources(path.join(directory, 'missing'))).toStrictEqual([])
    expect(
      readTypescriptProductionSources(directory).map(({ sourceFile }) =>
        path.relative(directory, sourceFile.fileName),
      ),
    ).toStrictEqual(['a.ts', 'nested/value.mts', 'z.tsx'])
  })

  it('finds exported annotated declarations and variables', () => {
    const sourceFile = parse(`
      /** @riviere-role aggregate */ export class Order {}
      /** @riviere-role domain-service */ export function policy(): void {}
      /** @riviere-role value-object */ export interface Identifier {}
      /** @riviere-role value-object */ export type Status = string
      /** @riviere-role value-object */ export enum State { Open }
      /** @riviere-role domain-service */ export const service = 1, { ignored } = source
      /** @riviere-role domain-service */ const hiddenService = 1
      export const unannotatedService = 1
      /** @riviere-role aggregate */ class Hidden {}
      export class Unannotated {}
      /** @riviere-role aggregate */ export default class {}
    `)

    const declarations = findTypescriptAnnotatedDeclarations(sourceFile, 'domain-model')

    expect(declarations.map(({ name }) => name)).toStrictEqual([
      'Order',
      'policy',
      'Identifier',
      'Status',
      'State',
      'service',
    ])
    expect(toTypescriptArchitectureItem(requiredDeclaration(declarations, 'Order'))).toStrictEqual({
      name: 'Order',
      packageKind: 'domain-model',
      role: 'aggregate',
    })
    expect(
      toTypescriptArchitectureItem(requiredDeclaration(declarations, 'Order'), [
        { name: 'Second', role: 'query-model-use-case' },
        { name: 'First', role: 'command-use-case' },
      ]),
    ).toStrictEqual({
      name: 'Order',
      packageKind: 'domain-model',
      relatedTo: [
        { name: 'First', role: 'command-use-case' },
        { name: 'Second', role: 'query-model-use-case' },
      ],
      role: 'aggregate',
    })
  })

  it('recognises aggregate state in properties and parameter properties', () => {
    const sourceFile = parse(`
      /** @riviere-role aggregate-entity */ export class Line {}
      /** @riviere-role aggregate */ export class Order {
        line: Line
        missing
        constructor(
          ordinary: Line,
          protected protectedLine: Line,
          public publicLine: Line,
          readonly other?: Line,
        ) {}
      }
      /** @riviere-role domain-service */ export function policy(): void {}
    `)
    const declarations = findTypescriptAnnotatedDeclarations(sourceFile, 'domain-model')
    const line = requiredDeclaration(declarations, 'Line')
    const order = requiredDeclaration(declarations, 'Order')
    const policy = requiredDeclaration(declarations, 'policy')

    expect(typescriptAggregateOwnsEntity(order, line)).toBe(true)
    expect(typescriptAggregateOwnsEntity(policy, line)).toBe(false)
  })

  it('does not infer ownership from unrelated or package import types', () => {
    const entitySource = ts.createSourceFile(
      '/workspace/entity.ts',
      '/** @riviere-role aggregate-entity */ export class Line {}',
      ts.ScriptTarget.Latest,
      true,
    )
    const aggregateSource = ts.createSourceFile(
      '/workspace/aggregate.ts',
      `
        import '@example/side-effect'
        import { Line } from '@example/entities'
        /** @riviere-role aggregate */ export class Order { line: Line }
      `,
      ts.ScriptTarget.Latest,
      true,
    )
    const line = requiredDeclaration(
      findTypescriptAnnotatedDeclarations(entitySource, 'domain-model'),
      'Line',
    )
    const order = requiredDeclaration(
      findTypescriptAnnotatedDeclarations(aggregateSource, 'domain-model'),
      'Order',
    )

    expect(typescriptAggregateOwnsEntity(order, line)).toBe(false)
  })

  it('detects references between annotated declarations', () => {
    const relatedSource = ts.createSourceFile(
      '/workspace/related.ts',
      '/** @riviere-role query-model */ export class Result {}',
      ts.ScriptTarget.Latest,
      true,
    )
    const useCaseSource = ts.createSourceFile(
      '/workspace/use-case.ts',
      `
        import { Result as Output } from './related'
        /** @riviere-role query-model-use-case */
        export class Query { execute(): Output { return new Output() } }
        /** @riviere-role query-model-use-case */ export class Unrelated {}
      `,
      ts.ScriptTarget.Latest,
      true,
    )
    const result = requiredDeclaration(
      findTypescriptAnnotatedDeclarations(relatedSource, 'use-cases'),
      'Result',
    )
    const useCases = findTypescriptAnnotatedDeclarations(useCaseSource, 'use-cases')

    expect(
      typescriptDeclarationReferencesDeclaration(requiredDeclaration(useCases, 'Query'), result),
    ).toBe(true)
    expect(
      typescriptDeclarationReferencesDeclaration(
        requiredDeclaration(useCases, 'Unrelated'),
        result,
      ),
    ).toBe(false)
  })

  it('handles missing types, same-named external types and each parameter property modifier', () => {
    const entitySource = ts.createSourceFile(
      '/workspace/entity.ts',
      '/** @riviere-role aggregate-entity */ export class Line {}',
      ts.ScriptTarget.Latest,
      true,
    )
    const aggregateSource = ts.createSourceFile(
      '/workspace/aggregate.ts',
      `
        /** @riviere-role aggregate-entity */ export class LocalLine {}
        /** @riviere-role aggregate */ export class MissingType { value }
        /** @riviere-role aggregate */ export class SameNamedExternal { value: Line }
        /** @riviere-role aggregate */ export class ProtectedState { constructor(protected value: LocalLine) {} }
        /** @riviere-role aggregate */ export class PublicState { constructor(public value: LocalLine) {} }
        /** @riviere-role aggregate */ export class ReadonlyState { constructor(readonly value: LocalLine) {} }
      `,
      ts.ScriptTarget.Latest,
      true,
    )
    const line = requiredDeclaration(
      findTypescriptAnnotatedDeclarations(entitySource, 'domain-model'),
      'Line',
    )
    const aggregates = findTypescriptAnnotatedDeclarations(aggregateSource, 'domain-model')
    const localLine = requiredDeclaration(aggregates, 'LocalLine')

    expect(
      ['MissingType', 'SameNamedExternal'].map((name) =>
        typescriptAggregateOwnsEntity(requiredDeclaration(aggregates, name), line),
      ),
    ).toStrictEqual([false, false])
    expect(
      ['ProtectedState', 'PublicState', 'ReadonlyState'].map((name) =>
        typescriptAggregateOwnsEntity(requiredDeclaration(aggregates, name), localLine),
      ),
    ).toStrictEqual([true, true, true])
  })

  it('reads unique public methods and sorts architecture items deterministically', () => {
    const sourceFile = parse(`
      /** @riviere-role aggregate */ export class Order {
        z(): void {}
        a(): void {}
        a(): void {}
        private hidden(): void {}
        protected inherited(): void {}
        #secret(): void {}
      }
      /** @riviere-role domain-service */ export function policy(): void {}
    `)
    const declarations = findTypescriptAnnotatedDeclarations(sourceFile, 'domain-model')
    const order = requiredDeclaration(declarations, 'Order')
    const policy = requiredDeclaration(declarations, 'policy')

    expect(readTypescriptPublicMethodNames(order)).toStrictEqual(['a', 'z'])
    expect(readTypescriptPublicMethodNames(policy)).toStrictEqual([])
    expect(
      uniqueTypescriptArchitectureItems([
        { name: 'Zed', packageKind: 'domain-model', role: 'value-object' },
        { name: 'Same', packageKind: 'published-language', role: 'event' },
        { name: 'Same', packageKind: 'domain-model', role: 'value-object' },
        { name: 'Zed', packageKind: 'domain-model', role: 'value-object' },
      ]),
    ).toStrictEqual([
      { name: 'Same', packageKind: 'domain-model', role: 'value-object' },
      { name: 'Same', packageKind: 'published-language', role: 'event' },
      { name: 'Zed', packageKind: 'domain-model', role: 'value-object' },
    ])
    expect(compareTypescriptText('a', 'b')).toBeLessThan(0)
  })

  it('reads matching package imports only', () => {
    const sourceFile = parse(`
      import '@example/orders-use-cases'
      import { PlaceOrder } from '@example/orders-use-cases/place-order'
      import { Ignore } from '@example/other'
      const value = 1
    `)

    expect(
      readTypescriptImportedPackageNames(
        [{ sourceFile }],
        new Set(['@example/orders-use-cases', '@example/missing']),
      ),
    ).toStrictEqual(new Set(['@example/orders-use-cases']))
  })

  it('reads package manifest names and fixture names', () => {
    const directory = temporaryDirectory()
    const manifestPath = path.join(directory, 'package.json')
    writeFileSync(manifestPath, JSON.stringify({ name: '@example/package' }))
    expect(readTypescriptPackageManifestName(manifestPath)).toBe('@example/package')

    expect(isTypescriptFixtureDirectory('fixtures')).toBe(true)
    expect(isTypescriptFixtureDirectory('__fixtures__')).toBe(true)
    expect(isTypescriptFixtureDirectory('production')).toBe(false)
  })

  it.each([[], null, {}, { name: '' }, { name: 42 }])(
    'rejects an invalid package manifest %#',
    (manifest) => {
      const manifestPath = path.join(temporaryDirectory(), 'package.json')
      writeFileSync(manifestPath, JSON.stringify(manifest))

      expect(() => readTypescriptPackageManifestName(manifestPath)).toThrow(
        TypescriptWorkspaceReadError,
      )
    },
  )

  it('rejects a malformed package manifest with the workspace reader error', () => {
    const manifestPath = path.join(temporaryDirectory(), 'package.json')
    writeFileSync(manifestPath, '{ malformed')

    expect(() => readTypescriptPackageManifestName(manifestPath)).toThrow(
      new TypescriptWorkspaceReadError(
        `Package manifest '${manifestPath}' must contain valid JSON.`,
      ),
    )
  })
})

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'typescript-source-reader-'))
  temporaryDirectories.push(directory)
  return directory
}

function write(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('/workspace/example.ts', source, ts.ScriptTarget.Latest, true)
}

function requiredDeclaration(
  declarations: ReturnType<typeof findTypescriptAnnotatedDeclarations>,
  name: string,
): ReturnType<typeof findTypescriptAnnotatedDeclarations>[number] {
  const declaration = declarations.find((candidate) => candidate.name === name)
  if (declaration === undefined)
    throw new MissingTestDeclarationError(`Missing declaration '${name}'.`)
  return declaration
}
