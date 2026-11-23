import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InboxFile } from '../adapters/inbox/inbox-file'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { ReplyToThread } from './reply-to-thread'

const threadFile = [
  'id: c-3',
  'type: comment',
  'document: PRD.md',
  'anchor:',
  '  selectedText: every repository',
  '  prefix: "Merge the graphs from "',
  '  suffix: " into one view"',
  '  firstLine: 14',
  '  occurrence: 0',
  'waitsFor: agent',
  'outcome: null',
  'messages:',
  '  - author: agent',
  '    time: 2026-11-26T10:04:40Z',
  '    text: Yes. I added a requirement about private repositories.',
].join('\n')

function factoryIn(text: string): { replyToThread: ReplyToThread; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-reply-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
    text,
  )
  const inbox = new InboxFile(folder)
  return {
    folder,
    replyToThread: new ReplyToThread(
      new ThreadRepository(folder),
      inbox,
      () => '2026-11-26T11:12:00Z',
    ),
  }
}

describe('ReplyToThread', () => {
  it('gives the thread back to the agent', () => {
    const { replyToThread } = factoryIn(threadFile)

    const result = replyToThread.execute({
      epic: 'cross-repo-linking',
      thread: 'c-3',
      text: 'Private ones as well, please.',
    })

    expect(result).toStrictEqual({ thread: 'c-3', waitsFor: 'agent' })
  })

  it('writes your reply to the thread file', () => {
    const { replyToThread, folder } = factoryIn(threadFile)

    replyToThread.execute({
      epic: 'cross-repo-linking',
      thread: 'c-3',
      text: 'Private ones as well, please.',
    })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
      'utf8',
    )
    expect(written).toContain('Private ones as well, please.')
    expect(written).toContain('waitsFor: agent')
  })

  it('puts a reply event in the inbox', () => {
    const { replyToThread, folder } = factoryIn(threadFile)

    replyToThread.execute({
      epic: 'cross-repo-linking',
      thread: 'c-3',
      text: 'Private ones as well, please.',
    })

    const line = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
    expect(JSON.parse(line)).toStrictEqual({
      kind: 'reply',
      n: 1,
      time: '2026-11-26T11:12:00Z',
      epic: 'cross-repo-linking',
      item: 'c-3',
      text: 'Private ones as well, please.',
    })
  })

  it('numbers the event after the ones already in the inbox', () => {
    const { replyToThread, folder } = factoryIn(threadFile)
    mkdirSync(join(folder, '.factory'), { recursive: true })
    writeFileSync(
      join(folder, '.factory', 'inbox.jsonl'),
      '{"n":7,"time":"t","kind":"comment","epic":"e","item":"c-1"}\n',
    )

    replyToThread.execute({ epic: 'cross-repo-linking', thread: 'c-3', text: 'And private ones.' })

    expect(readEventsIn(folder)).toStrictEqual([
      { n: 7, time: 't', kind: 'comment', epic: 'e', item: 'c-1' },
      {
        kind: 'reply',
        n: 8,
        time: '2026-11-26T11:12:00Z',
        epic: 'cross-repo-linking',
        item: 'c-3',
        text: 'And private ones.',
      },
    ])
  })
})

function readEventsIn(folder: string): unknown {
  const text = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
  return JSON.parse(`[${text.trim().split('\n').join(',')}]`)
}
