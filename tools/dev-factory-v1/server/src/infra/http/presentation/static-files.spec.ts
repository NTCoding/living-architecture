import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { staticFileOf } from './static-files'

function uiFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), 'factory-static-'))
  writeFileSync(join(folder, 'index.html'), '<!doctype html>')
  return folder
}

describe('staticFileOf', () => {
  it('reads a file the UI ships, with its content type', () => {
    expect(staticFileOf(uiFolder(), 'index.html')).toStrictEqual({
      content: '<!doctype html>',
      type: 'text/html; charset=utf-8',
    })
  })

  it('reads nothing for a name that is empty or climbs out of the folder', () => {
    const folder = uiFolder()

    expect(staticFileOf(folder, '')).toBeUndefined()
    expect(staticFileOf(folder, '../index.html')).toBeUndefined()
  })

  it('reads nothing for a file the UI does not ship', () => {
    expect(staticFileOf(uiFolder(), 'missing.html')).toBeUndefined()
  })
})
