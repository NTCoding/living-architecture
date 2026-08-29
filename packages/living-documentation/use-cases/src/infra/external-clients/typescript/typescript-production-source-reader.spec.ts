import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isTypescriptFixtureDirectory,
  readTypescriptProductionSources,
} from './typescript-production-source-reader'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true })
})

describe('TypeScript production source reader', () => {
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
      ['__tests__/support.ts', '/** @riviere-role domain-service */ export const support = 1'],
      ['nested/value.mts', 'export const value = 1'],
      ['test/support.ts', '/** @riviere-role domain-service */ export const support = 1'],
      ['tests/support.ts', '/** @riviere-role domain-service */ export const support = 1'],
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

  it('identifies fixture directories', () => {
    expect(isTypescriptFixtureDirectory('fixtures')).toBe(true)
    expect(isTypescriptFixtureDirectory('__fixtures__')).toBe(true)
    expect(isTypescriptFixtureDirectory('production')).toBe(false)
  })
})

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'typescript-production-source-reader-'))
  temporaryDirectories.push(directory)
  return directory
}

function write(directory: string, relativePath: string, contents: string): void {
  const filePath = path.join(directory, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}
