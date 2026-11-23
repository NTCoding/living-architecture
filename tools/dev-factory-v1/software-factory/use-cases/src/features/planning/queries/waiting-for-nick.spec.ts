import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DecisionRepository } from '../data-access/decision/decision-repository'
import { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'
import { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { ListWaitingForNick } from './waiting-for-nick'

type FileToWrite = { readonly name: string; readonly text: string }

const threadFromAgent = [
  'id: c-3',
  'type: comment',
  'document: PRD.md',
  'anchor:',
  '  selectedText: every repository',
  '  prefix: ""',
  '  suffix: ""',
  '  firstLine: 14',
  '  occurrence: 0',
  'waitsFor: nick',
  'outcome: null',
  'messages:',
  '  - author: agent',
  '    time: 2026-11-26T10:04:40Z',
  '    text: Yes. I added a requirement about private repositories.',
].join('\n')

const unansweredDecision = [
  'id: d-2',
  'type: decision',
  'document: ARCH.md',
  'question: Will the merged graph be written to one file?',
  'answer: null',
  'followed: false',
  'outcome: null',
].join('\n')

function waitingIn(files: readonly FileToWrite[], alsoIn?: string): ListWaitingForNick {
  const folder = mkdtempSync(join(tmpdir(), 'factory-waiting-'))
  const epic = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking')
  mkdirSync(join(epic, 'threads'), { recursive: true })
  writeFileSync(join(epic, 'epic.yml'), 'title: Cross-repo linking\nstage: in-progress\n')
  for (const file of files) writeFileSync(join(epic, 'threads', file.name), file.text)
  if (alsoIn !== undefined) {
    const second = join(folder, 'docs', 'project', 'PRD', alsoIn)
    mkdirSync(join(second, 'threads'), { recursive: true })
    writeFileSync(join(second, 'epic.yml'), 'title: Archive\nstage: in-progress\n')
    writeFileSync(join(second, 'threads', 'c-9.yml'), threadFromAgent)
  }
  return new ListWaitingForNick(
    new PlanningFoldersLoader(folder),
    new ThreadIdsLoader(folder),
    new ThreadRepository(folder),
    new DecisionRepository(folder),
  )
}

describe('ListWaitingForNick', () => {
  it('lists a thread whose last message is the agent one', () => {
    const waiting = waitingIn([{ name: 'c-3.yml', text: threadFromAgent }]).execute({})

    expect(waiting.items).toStrictEqual([
      {
        epic: 'cross-repo-linking',
        item: 'c-3',
        kind: 'comment',
        document: 'PRD.md',
        question: null,
        last: 'Yes. I added a requirement about private repositories.',
      },
    ])
  })

  it('lists a decision that nobody has answered', () => {
    const waiting = waitingIn([{ name: 'd-2.yml', text: unansweredDecision }]).execute({})

    expect(waiting.items).toStrictEqual([
      {
        epic: 'cross-repo-linking',
        item: 'd-2',
        kind: 'decision',
        document: 'ARCH.md',
        question: 'Will the merged graph be written to one file?',
        last: '',
      },
    ])
  })

  it('leaves out a thread that waits for the agent', () => {
    const waitingForAgent = threadFromAgent
      .replace('author: agent', 'author: nick')
      .replace('Yes. I added a requirement about private repositories.', 'And private ones?')

    expect(waitingIn([{ name: 'c-3.yml', text: waitingForAgent }]).execute({}).items).toStrictEqual(
      [],
    )
  })

  it('sorts the items by epic', () => {
    const waiting = waitingIn([{ name: 'c-3.yml', text: threadFromAgent }], 'archive-epic')

    expect(waiting.execute({}).items.map((item) => item.epic)).toStrictEqual([
      'archive-epic',
      'cross-repo-linking',
    ])
  })

  it('leaves out a decision that has been answered', () => {
    const answered = unansweredDecision
      .replace(
        'answer: null',
        'answer:\n  choice: proposal\n  chosen: One file per workspace.\n  reply: null\n  time: 2026-11-27T09:41:00Z',
      )
      .replace('followed: false', 'followed: true')
      .replace('outcome: null', 'outcome:\n  closedBy: agent\n  time: 2026-11-27T10:30:00Z')

    expect(waitingIn([{ name: 'd-2.yml', text: answered }]).execute({}).items).toStrictEqual([])
  })

  it('reads no items from a repo with no epics', () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-no-epics-'))

    const waiting = new ListWaitingForNick(
      new PlanningFoldersLoader(folder),
      new ThreadIdsLoader(folder),
      new ThreadRepository(folder),
      new DecisionRepository(folder),
    ).execute({})

    expect(waiting.items).toStrictEqual([])
  })
})
