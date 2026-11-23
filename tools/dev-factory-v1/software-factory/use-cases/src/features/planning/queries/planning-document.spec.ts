import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PlanningDocumentLoader } from '../data-access/document/planning-document-loader'
import { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import { ThreadRepository } from '../data-access/thread/thread-repository'
import { ShowPlanningDocument } from './planning-document'

const markdown = [
  '# The architecture',
  '',
  '## Will the merged graph be written to one file?',
  '',
  ':::decision d-2',
  'proposal: Write one merged graph file per workspace.',
  'alternative: Write one file per repository.',
  'pick: proposal, because a workspace is the unit you publish.',
  ':::',
].join('\n')

const thread = [
  'id: c-3',
  'type: comment',
  'document: ARCH.md',
  'anchor:',
  '  selectedText: one merged graph',
  '  prefix: ""',
  '  suffix: ""',
  '  firstLine: 3',
  '  occurrence: 0',
  'waitsFor: nick',
  'outcome: null',
  'messages:',
  '  - author: agent',
  '    time: 2026-11-26T10:04:40Z',
  '    text: Yes. It is one file per workspace.',
].join('\n')

function factoryWith(threads: readonly { name: string; text: string }[]): ShowPlanningDocument {
  const folder = mkdtempSync(join(tmpdir(), 'factory-show-document-'))
  const epic = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking')
  mkdirSync(join(epic, 'threads'), { recursive: true })
  writeFileSync(join(epic, 'ARCH.md'), markdown)
  for (const file of threads) writeFileSync(join(epic, 'threads', file.name), file.text)
  return new ShowPlanningDocument(
    new PlanningDocumentLoader(folder),
    new ThreadIdsLoader(folder),
    new ThreadRepository(folder),
  )
}

describe('ShowPlanningDocument', () => {
  it('returns the Markdown and the question it asks', () => {
    const view = factoryWith([]).execute({ epic: 'cross-repo-linking', document: 'ARCH.md' })

    expect(view.name).toBe('ARCH.md')
    expect(view.decisions).toStrictEqual([
      {
        id: 'd-2',
        question: 'Will the merged graph be written to one file?',
        pick: 'proposal, because a workspace is the unit you publish.',
      },
    ])
  })

  it('returns the threads on that document and no others', () => {
    const view = factoryWith([
      { name: 'c-3.yml', text: thread },
      { name: 'c-4.yml', text: thread.replace('document: ARCH.md', 'document: PRD.md') },
    ]).execute({ epic: 'cross-repo-linking', document: 'ARCH.md' })

    expect(view.threads).toStrictEqual([
      {
        id: 'c-3',
        waitsFor: 'nick',
        firstLine: 3,
        messages: [
          {
            author: 'agent',
            time: '2026-11-26T10:04:40Z',
            text: 'Yes. It is one file per workspace.',
          },
        ],
      },
    ])
  })

  it('returns a document that has not been written yet', () => {
    const view = factoryWith([]).execute({ epic: 'cross-repo-linking', document: 'PRD.md' })

    expect(view).toStrictEqual({ name: 'PRD.md', markdown: '', decisions: [], threads: [] })
  })
})
