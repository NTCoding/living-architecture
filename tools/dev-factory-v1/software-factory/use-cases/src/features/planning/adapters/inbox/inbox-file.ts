import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { InboxLog } from '@dev-factory-v1/domain-model/domain/ports/inbox-log'

/**
 * @riviere-role domain-port-adapter
 *
 * The inbox as 2 files in the repo that the factory works on. It only moves lines and the cursor
 * number, and says nothing about what an event means.
 */
export class InboxFile implements InboxLog {
  constructor(private readonly targetRepo: string) {}

  appendLine(line: string): void {
    const path = this.inboxPath()
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, `${line}\n`, 'utf8')
  }

  readLines(): readonly string[] {
    return readTextOf(this.inboxPath()).split('\n')
  }

  printedNumber(): number {
    const text = readTextOf(this.cursorPath())
    if (text === '') return 0
    const parsed: unknown = JSON.parse(text)
    if (!isMapping(parsed)) return 0
    const number = parsed['lastPrinted']
    return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : 0
  }

  rememberPrinted(number: number): void {
    const path = this.cursorPath()
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify({ lastPrinted: number }), 'utf8')
  }

  private inboxPath(): string {
    return join(this.targetRepo, '.factory', 'inbox.jsonl')
  }

  private cursorPath(): string {
    return join(this.targetRepo, '.factory', 'inbox-cursor.json')
  }
}

function readTextOf(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
