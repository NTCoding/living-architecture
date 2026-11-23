import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import { InboxFile } from '../adapters/inbox/inbox-file'
import { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { CommentOnDocument } from './comment-on-document'

const anchor = {
  selectedText: 'every repository',
  prefix: 'Merge the graphs from ',
  suffix: ' into one view',
  firstLine: 14,
  occurrence: 0,
}

function emptyFactory(): { commentOnDocument: CommentOnDocument; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-comment-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking'), { recursive: true })
  return {
    folder,
    commentOnDocument: new CommentOnDocument(
      new ThreadRepository(folder),
      new ThreadIdsLoader(folder),
      new AgentInbox(new InboxFile(folder)),
      () => '2026-11-26T10:02:11Z',
    ),
  }
}

describe('CommentOnDocument', () => {
  it('opens the first thread of an epic and waits for the agent', () => {
    const { commentOnDocument } = emptyFactory()

    const result = commentOnDocument.execute({
      epic: 'cross-repo-linking',
      document: 'PRD.md',
      anchor,
      text: 'Does this include private repositories?',
    })

    expect(result).toStrictEqual({ thread: 'c-1', waitsFor: 'agent' })
  })

  it('writes the thread with your comment and its passage', () => {
    const { commentOnDocument, folder } = emptyFactory()

    commentOnDocument.execute({
      epic: 'cross-repo-linking',
      document: 'PRD.md',
      anchor,
      text: 'Does this include private repositories?',
    })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-1.yml'),
      'utf8',
    )
    expect(written).toContain('document: PRD.md')
    expect(written).toContain('selectedText: every repository')
    expect(written).toContain('Does this include private repositories?')
    expect(written).toContain('author: nick')
  })

  it('numbers the next thread after the ones the epic has', () => {
    const { commentOnDocument } = emptyFactory()
    const comment = {
      epic: 'cross-repo-linking',
      document: 'PRD.md',
      anchor,
      text: 'Does this include private repositories?',
    }
    commentOnDocument.execute(comment)

    const second = commentOnDocument.execute({ ...comment, text: 'And the private ones?' })

    expect(second.thread).toBe('c-2')
  })

  it('puts a comment event in the inbox', () => {
    const { commentOnDocument, folder } = emptyFactory()

    commentOnDocument.execute({
      epic: 'cross-repo-linking',
      document: 'PRD.md',
      anchor,
      text: 'Does this include private repositories?',
    })

    const events = new AgentInbox(new InboxFile(folder)).eventsSince(0)
    expect(events).toStrictEqual([
      {
        kind: 'comment',
        number: 1,
        time: '2026-11-26T10:02:11Z',
        epic: 'cross-repo-linking',
        item: 'c-1',
      },
    ])
  })
})
