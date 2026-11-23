import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidThread } from '@dev-factory-v1/domain-model/domain/planning/thread'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { ResolveThread } from './resolve-thread'

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
  'waitsFor: nick',
  'outcome: null',
  'messages:',
  '  - author: agent',
  '    time: 2026-11-26T10:04:40Z',
  '    text: Yes. I added a requirement about private repositories.',
].join('\n')

function threadIn(text: string): { resolveThread: ResolveThread; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-resolve-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
    text,
  )
  return {
    folder,
    resolveThread: new ResolveThread(new ThreadRepository(folder), () => '2026-11-26T12:00:00Z'),
  }
}

describe('ResolveThread', () => {
  it('closes the thread and says who closed it', () => {
    const { resolveThread } = threadIn(threadFile)

    const result = resolveThread.execute({ epic: 'cross-repo-linking', thread: 'c-3' })

    expect(result).toStrictEqual({ thread: 'c-3', closedBy: 'nick' })
  })

  it('writes the outcome to the thread file', () => {
    const { resolveThread, folder } = threadIn(threadFile)

    resolveThread.execute({ epic: 'cross-repo-linking', thread: 'c-3' })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
      'utf8',
    )
    expect(written).toContain('closedBy: nick')
    expect(written).toContain('time: 2026-11-26T12:00:00Z')
    expect(written).toContain('waitsFor: nobody')
  })

  it('adds nothing to the inbox', () => {
    const { resolveThread, folder } = threadIn(threadFile)

    resolveThread.execute({ epic: 'cross-repo-linking', thread: 'c-3' })

    expect(existsSync(join(folder, '.factory', 'inbox.jsonl'))).toBe(false)
  })

  it('refuses a thread that still waits for the agent', () => {
    const waitingForAgent = threadFile
      .replace('author: agent', 'author: nick')
      .replace('Yes. I added a requirement about private repositories.', 'And private ones?')
    const { resolveThread } = threadIn(waitingForAgent)

    expect(() => resolveThread.execute({ epic: 'cross-repo-linking', thread: 'c-3' })).toThrow(
      new InvalidThread('The thread c-3 waits for the agent, so it cannot be closed yet.'),
    )
  })
})
