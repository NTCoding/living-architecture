import {
  mkdtempSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import {
  DraftComponentLoadError, loadDraftComponentsFromFile 
} from './draft-component-loader'

function createTempFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'draft-component-loader-'))
  const filePath = join(dir, 'draft-components.json')
  writeFileSync(filePath, contents, 'utf-8')
  return filePath
}

describe('loadDraftComponentsFromFile', () => {
  it('throws when file is missing', () => {
    expect(() => loadDraftComponentsFromFile('/missing/file.json')).toThrow(DraftComponentLoadError)
  })

  it('throws when file contains invalid JSON', () => {
    expect(() => loadDraftComponentsFromFile(createTempFile('{invalid'))).toThrow(/invalid JSON/)
  })

  it('throws when file does not contain draft components', () => {
    expect(() => loadDraftComponentsFromFile(createTempFile('{"hello":"world"}'))).toThrow(
      /does not contain valid draft components/,
    )
  })
})
