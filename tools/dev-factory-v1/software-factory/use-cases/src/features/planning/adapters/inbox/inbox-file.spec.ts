import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InboxFile } from './inbox-file'

function emptyRepo(): { inbox: InboxFile; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-inbox-'))
  return { folder, inbox: new InboxFile(folder) }
}

describe('InboxFile', () => {
  it('has no lines before the first event', () => {
    const { inbox } = emptyRepo()

    expect(inbox.readLines()).toStrictEqual([''])
  })

  it('appends one line per call, in the order they happened', () => {
    const { inbox, folder } = emptyRepo()

    inbox.appendLine('{"n":41}')
    inbox.appendLine('{"n":42}')

    const written = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
    expect(written).toBe('{"n":41}\n{"n":42}\n')
  })

  it('reads back the lines it wrote', () => {
    const { inbox } = emptyRepo()
    inbox.appendLine('{"n":41}')

    expect(inbox.readLines()).toStrictEqual(['{"n":41}', ''])
  })

  it('starts the cursor at 0', () => {
    const { inbox } = emptyRepo()

    expect(inbox.printedNumber()).toBe(0)
  })

  it('remembers the cursor the planning session printed', () => {
    const { inbox, folder } = emptyRepo()

    inbox.rememberPrinted(42)

    expect(inbox.printedNumber()).toBe(42)
    expect(readFileSync(join(folder, '.factory', 'inbox-cursor.json'), 'utf8')).toBe(
      '{"lastPrinted":42}',
    )
  })

  it('reads 0 from a cursor that says nothing useful', () => {
    const { inbox, folder } = emptyRepo()
    mkdirSync(join(folder, '.factory'), { recursive: true })
    writeFileSync(join(folder, '.factory', 'inbox-cursor.json'), '{"lastPrinted":"later"}')

    expect(inbox.printedNumber()).toBe(0)
  })

  it('reads 0 from a cursor that is not a JSON object', () => {
    const { inbox, folder } = emptyRepo()
    mkdirSync(join(folder, '.factory'), { recursive: true })
    writeFileSync(join(folder, '.factory', 'inbox-cursor.json'), '[42]')

    expect(inbox.printedNumber()).toBe(0)
  })

  it('refuses a cursor that is not JSON', () => {
    const { inbox, folder } = emptyRepo()
    mkdirSync(join(folder, '.factory'), { recursive: true })
    writeFileSync(join(folder, '.factory', 'inbox-cursor.json'), 'later')

    expect(() => inbox.printedNumber()).toThrow(SyntaxError)
  })
})
