import {
  writeFileSync, mkdirSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import {
  describe, it, expect, beforeEach, afterAll 
} from 'vitest'
import {
  loadDraftComponentsFromFile, DraftComponentLoadError 
} from './draft-component-loader'

const testDir = join(import.meta.dirname, '__test-fixtures-draft-loader__')

beforeEach(() => {
  mkdirSync(testDir, { recursive: true })
})

afterAll(() => {
  rmSync(testDir, {
    recursive: true,
    force: true,
  })
})

describe('loadDraftComponentsFromFile', () => {
  it('loads valid draft components from JSON file', () => {
    const filePath = join(testDir, 'valid.json')
    writeFileSync(
      filePath,
      JSON.stringify([
        {
          type: 'useCase',
          name: 'PlaceOrder',
          domain: 'orders',
          location: {
            file: 'src/order.ts',
            line: 1,
          },
        },
      ]),
    )

    const result = loadDraftComponentsFromFile(filePath)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'useCase',
      name: 'PlaceOrder',
      domain: 'orders',
    })
  })

  it('throws DraftComponentLoadError when file not found', () => {
    expect(() => loadDraftComponentsFromFile('nonexistent.json')).toThrow(DraftComponentLoadError)
    expect(() => loadDraftComponentsFromFile('nonexistent.json')).toThrow('not found')
  })

  it('throws DraftComponentLoadError when file contains invalid JSON', () => {
    const filePath = join(testDir, 'invalid.json')
    writeFileSync(filePath, 'not valid json{{{')

    expect(() => loadDraftComponentsFromFile(filePath)).toThrow(DraftComponentLoadError)
    expect(() => loadDraftComponentsFromFile(filePath)).toThrow('invalid JSON')
  })

  it('throws DraftComponentLoadError when file contains non-array JSON', () => {
    const filePath = join(testDir, 'non-array.json')
    writeFileSync(filePath, JSON.stringify({ not: 'an array' }))

    expect(() => loadDraftComponentsFromFile(filePath)).toThrow(DraftComponentLoadError)
    expect(() => loadDraftComponentsFromFile(filePath)).toThrow('valid draft components')
  })

  it('throws DraftComponentLoadError when array contains invalid draft component format', () => {
    const filePath = join(testDir, 'invalid-draft.json')
    writeFileSync(filePath, JSON.stringify([{ wrong: 'format' }]))

    expect(() => loadDraftComponentsFromFile(filePath)).toThrow(DraftComponentLoadError)
    expect(() => loadDraftComponentsFromFile(filePath)).toThrow('valid draft components')
  })
})

describe('DraftComponentLoadError', () => {
  it('creates error with name DraftComponentLoadError', () => {
    const error = new DraftComponentLoadError('test')

    expect(error.name).toBe('DraftComponentLoadError')
    expect(error.message).toBe('test')
  })
})
