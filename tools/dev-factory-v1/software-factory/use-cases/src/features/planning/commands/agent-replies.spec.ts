import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidThread } from '@dev-factory-v1/domain-model'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { AgentReplies } from './agent-replies'

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
  '  - author: nick',
  '    time: 2026-11-26T10:02:11Z',
  '    text: Does this include private repositories?',
].join('\n')

function threadIn(text: string): { agentReplies: AgentReplies; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-agent-replies-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
    text,
  )
  const threads = new ThreadRepository(folder)
  return {
    folder,
    agentReplies: new AgentReplies(threads, () => '2026-11-26T10:04:40Z'),
  }
}

describe('AgentReplies', () => {
  it('adds the agent message and gives the thread back to Nick', () => {
    const { agentReplies } = threadIn(threadFile)

    const result = agentReplies.execute({
      epic: 'cross-repo-linking',
      thread: 'c-3',
      text: 'Yes. I added a requirement about private repositories.',
    })

    expect(result).toStrictEqual({ thread: 'c-3', waitsFor: 'nick' })
  })

  it('writes the reply to the thread file', () => {
    const { agentReplies, folder } = threadIn(threadFile)

    agentReplies.execute({
      epic: 'cross-repo-linking',
      thread: 'c-3',
      text: 'Yes. I added a requirement about private repositories.',
    })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
      'utf8',
    )
    expect(written).toContain('author: agent')
    expect(written).toContain('I added a requirement about private repositories.')
    expect(written).toContain('waitsFor: nick')
  })

  it('refuses to reply to a thread that is closed', () => {
    const closed = threadFile.replace(
      'outcome: null',
      'outcome:\n  closedBy: nick\n  time: 2026-11-26T11:00:00Z',
    )
    const { agentReplies } = threadIn(closed)

    expect(() =>
      agentReplies.execute({ epic: 'cross-repo-linking', thread: 'c-3', text: 'One more thing.' }),
    ).toThrow(new InvalidThread('The thread c-3 is closed, so it cannot be replied to.'))
  })
})
