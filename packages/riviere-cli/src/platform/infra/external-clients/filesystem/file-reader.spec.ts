import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileReadError, fileExists, readJsonFile, readTextFile } from './index'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true })
  temporaryDirectories.length = 0
})

function createFile(content: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'riviere-file-reader-'))
  temporaryDirectories.push(directory)
  const filePath = join(directory, 'input.json')
  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

describe('filesystem client', () => {
  it('checks paths and reads UTF-8 text', () => {
    const filePath = createFile('hello')

    expect(fileExists(filePath)).toBe(true)
    expect(fileExists(join(dirname(filePath), 'missing'))).toBe(false)
    expect(readTextFile(filePath)).toBe('hello')
  })

  it('reads JSON as unknown', () => {
    expect(readJsonFile(createFile('{"value":42}'))).toStrictEqual({ value: 42 })
  })

  it('reports a missing JSON file using the supplied description', () => {
    expect(() => readJsonFile('/missing/input.json', 'Draft file')).toThrow(
      new FileReadError('Draft file not found: /missing/input.json'),
    )
  })

  it('reports invalid JSON', () => {
    expect(() => readJsonFile(createFile('{invalid'))).toThrow(/File contains invalid JSON/)
  })
})
