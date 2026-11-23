import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidDecision } from '@dev-factory-v1/domain-model/domain/planning/decision'
import { DecisionRepository } from '../data-access/decision/decision-repository'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { AgentClosesItem } from './agent-closes-item'

const decisionFile = [
  'id: d-2',
  'type: decision',
  'document: ARCH.md',
  'question: Will the merged graph be written to one file?',
  'answer:',
  '  choice: proposal',
  '  chosen: Write one merged graph file per workspace.',
  '  reply: null',
  '  time: 2026-11-27T09:41:00Z',
  'followed: false',
  'outcome: null',
].join('\n')

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

type FileToWrite = { readonly name: string; readonly text: string }

function factoryWith(files: readonly FileToWrite[]): {
  agentClosesItem: AgentClosesItem
  folder: string
} {
  const folder = mkdtempSync(join(tmpdir(), 'factory-agent-closes-'))
  const folderOf = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads')
  mkdirSync(folderOf, { recursive: true })
  for (const file of files) writeFileSync(join(folderOf, file.name), file.text)
  return {
    folder,
    agentClosesItem: new AgentClosesItem(
      new DecisionRepository(folder),
      new ThreadRepository(folder),
      () => '2026-11-27T10:30:00Z',
    ),
  }
}

describe('AgentClosesItem', () => {
  it('closes the decision it has followed', () => {
    const { agentClosesItem } = factoryWith([{ name: 'd-2.yml', text: decisionFile }])

    const result = agentClosesItem.execute({ epic: 'cross-repo-linking', item: 'd-2' })

    expect(result).toStrictEqual({ item: 'd-2', closedBy: 'agent' })
  })

  it('writes the follow and the outcome to the decision file', () => {
    const { agentClosesItem, folder } = factoryWith([{ name: 'd-2.yml', text: decisionFile }])

    agentClosesItem.execute({ epic: 'cross-repo-linking', item: 'd-2' })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'd-2.yml'),
      'utf8',
    )
    expect(written).toContain('followed: true')
    expect(written).toContain('closedBy: agent')
    expect(written).toContain('time: 2026-11-27T10:30:00Z')
  })

  it('closes a thread it has nothing left to add to', () => {
    const { agentClosesItem, folder } = factoryWith([{ name: 'c-3.yml', text: threadFile }])

    agentClosesItem.execute({ epic: 'cross-repo-linking', item: 'c-3' })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'c-3.yml'),
      'utf8',
    )
    expect(written).toContain('closedBy: agent')
    expect(written).toContain('waitsFor: nobody')
  })

  it('refuses a decision that nobody has answered', () => {
    const unanswered = decisionFile.replace(
      'answer:\n  choice: proposal\n  chosen: Write one merged graph file per workspace.\n  reply: null\n  time: 2026-11-27T09:41:00Z',
      'answer: null',
    )
    const { agentClosesItem } = factoryWith([{ name: 'd-2.yml', text: unanswered }])

    expect(() => agentClosesItem.execute({ epic: 'cross-repo-linking', item: 'd-2' })).toThrow(
      new InvalidDecision('The decision d-2 has no answer, so the agent cannot follow it.'),
    )
  })
})
