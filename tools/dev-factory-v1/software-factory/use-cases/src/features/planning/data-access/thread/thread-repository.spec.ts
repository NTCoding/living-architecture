import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Thread } from '@dev-factory-v1/domain-model/domain/planning/thread'
import { ThreadFileError, ThreadRepository } from './thread-repository'

const threadFile = [
  'id: c-3',
  'type: comment',
  'document: problem-definition.md',
  'anchor:',
  '  firstLine: 5',
  '  selectedText: every repository',
  '  prefix: Merge the graphs from',
  '  suffix: into one view',
  '  occurrence: 0',
  'waitsFor: agent',
  'outcome: null',
  'messages:',
  '  - author: nick',
  '    time: 2026-11-26T10:02:11Z',
  '    text: Does this include private repositories?',
].join('\n')

function repoWithThread(text: string): { repository: ThreadRepository; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-thread-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
    text,
  )
  return { repository: new ThreadRepository(folder), folder }
}

describe('ThreadRepository', () => {
  it('loads a thread from its file', () => {
    const { repository } = repoWithThread(threadFile)

    const thread = repository.load('cross-repo-linking', 'c-3')

    expect(thread.id()).toBe('c-3')
    expect(thread.document()).toBe('problem-definition.md')
    expect(thread.anchor().selectedText).toBe('every repository')
    expect(thread.waitsFor()).toBe('agent')
  })

  it('saves a thread and loads it back', () => {
    const { repository, folder } = repoWithThread(threadFile)
    const replied = repository
      .load('cross-repo-linking', 'c-3')
      .replying({ author: 'agent', time: '2026-11-26T10:04:40Z', text: 'Yes, it does.' })

    repository.save('cross-repo-linking', replied)

    expect(repository.load('cross-repo-linking', 'c-3').waitsFor()).toBe('nick')
    expect(
      readFileSync(
        join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
        'utf8',
      ),
    ).toContain('waitsFor: nick')
  })

  it('writes who closed the thread', () => {
    const { repository } = repoWithThread(threadFile)
    const closed = repository
      .load('cross-repo-linking', 'c-3')
      .replying({ author: 'agent', time: '2026-11-26T10:04:40Z', text: 'Yes.' })
      .resolved({ closedBy: 'nick', time: '2026-11-26T11:00:00Z' })

    repository.save('cross-repo-linking', closed)

    expect(repository.load('cross-repo-linking', 'c-3').outcome()).toStrictEqual({
      closedBy: 'nick',
      time: '2026-11-26T11:00:00Z',
    })
  })

  it('creates the threads folder of a new epic', () => {
    const { repository, folder } = repoWithThread(threadFile)

    repository.save(
      'phase-14-cross-repo-linking',
      Thread.from({
        id: 'c-1',
        document: 'PRD.md',
        anchor: { selectedText: 'one graph', prefix: '', suffix: '' },
        messages: [{ author: 'nick', time: '2026-11-26T10:02:11Z', text: 'Which graph?' }],
        outcome: null,
      }),
    )

    expect(
      readFileSync(
        join(folder, 'docs', 'project', 'PRD', 'phase-14-cross-repo-linking', 'threads', 'c-1.yml'),
        'utf8',
      ),
    ).toContain('document: PRD.md')
  })

  it('says so when the thread file is missing', () => {
    const { repository } = repoWithThread(threadFile)

    expect(() => repository.load('cross-repo-linking', 'c-9')).toThrow(
      'There is no thread c-9 in cross-repo-linking',
    )
  })

  it('refuses a thread id that is not a comment thread', () => {
    const { repository } = repoWithThread(threadFile)

    expect(() => repository.load('cross-repo-linking', 'd-3')).toThrow('c-1.yml or c-2.yml')
  })

  it('refuses an epic folder that is not a slug', () => {
    const { repository } = repoWithThread(threadFile)

    expect(() => repository.load('Cross Repo', 'c-3')).toThrow('An epic folder is a slug')
  })

  it('says when the file is not YAML', () => {
    const { repository } = repoWithThread('id: [unclosed')

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow(ThreadFileError)
  })

  it('says when the file is not a mapping', () => {
    const { repository } = repoWithThread('- one\n- two')

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow('is not a mapping')
  })

  it('says when the anchor is not a mapping', () => {
    const { repository } = repoWithThread(
      'document: PRD.md\nanchor: 4\nmessages:\n  - author: nick\n    time: now\n    text: x',
    )

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow('anchor of c-3 is a mapping')
  })

  it('leaves out an anchor prefix and suffix that are not there', () => {
    const { repository } = repoWithThread(
      [
        'document: PRD.md',
        'anchor:',
        '  selectedText: one graph',
        'messages:',
        '  - author: nick',
        '    time: 2026-11-26T10:02:11Z',
        '    text: Which graph?',
      ].join('\n'),
    )

    expect(repository.load('cross-repo-linking', 'c-3').anchor()).toStrictEqual({
      selectedText: 'one graph',
      prefix: '',
      suffix: '',
      firstLine: 1,
      occurrence: 0,
    })
  })

  it('says when the messages are not a list', () => {
    const { repository } = repoWithThread(
      'document: PRD.md\nanchor:\n  selectedText: x\nmessages: 4',
    )

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow('messages of c-3 are a list')
  })

  it('says when a message is not a mapping', () => {
    const { repository } = repoWithThread(
      'document: PRD.md\nanchor:\n  selectedText: x\nmessages:\n  - Hello.\n',
    )

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow(
      'A message of c-3 is a mapping',
    )
  })

  it('says when the outcome is not a mapping', () => {
    const { repository } = repoWithThread(
      'document: PRD.md\nanchor:\n  selectedText: x\noutcome: closed\nmessages:\n  - author: nick\n    time: now\n    text: x\n',
    )

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow(
      'outcome of c-3 is a mapping',
    )
  })

  it('says when a field the thread needs is missing', () => {
    const { repository } = repoWithThread(
      'anchor:\n  selectedText: x\nmessages:\n  - author: nick\n    time: now\n    text: x\n',
    )

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow('The document of c-3')
  })
})
