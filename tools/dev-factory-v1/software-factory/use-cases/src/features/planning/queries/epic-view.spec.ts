import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { IssueState } from '@dev-factory-v1/domain-model/domain/ports/read-issue-states'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { ShowEpic } from './epic-view'

const epicFile = [
  'title: Cross-repo linking',
  'idea: cross-repo-linking',
  'stage: in-progress',
  'features:',
  '  - id: M1',
  '    title: Builder API extension',
  '    stories:',
  '      - 901',
  '      - 902',
  'history:',
  '  - event: stories-recorded',
  '    time: 2026-11-28T09:15:00Z',
].join('\n')

function epicOf(states: readonly IssueState[]): ShowEpic {
  const folder = mkdtempSync(join(tmpdir(), 'factory-show-epic-'))
  const path = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking')
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'epic.yml'), epicFile)
  return new ShowEpic(new EpicRepository(folder), () => Promise.resolve(states))
}

describe('ShowEpic', () => {
  it('says which stories are closed', async () => {
    const view = await epicOf([{ number: 901, closed: true }]).execute({
      epic: 'cross-repo-linking',
    })

    expect(view.features).toStrictEqual([
      {
        id: 'M1',
        title: 'Builder API extension',
        stories: [
          { number: 901, closed: true },
          { number: 902, closed: false },
        ],
      },
    ])
  })

  it('says the stage and the history of the epic', async () => {
    const view = await epicOf([]).execute({ epic: 'cross-repo-linking' })

    expect([view.stage, view.step]).toStrictEqual(['in-progress', null])
    expect(view.history).toStrictEqual([
      { event: 'stories-recorded', step: null, time: '2026-11-28T09:15:00Z', reason: null },
    ])
  })

  it('says the step of an epic that is being planned', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-show-epic-planning-'))
    const path = join(folder, 'docs', 'project', 'PRD', 'one')
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'epic.yml'),
      'title: One\nstage: planning\nstep: prd\nfeatures: []\nhistory: []\n',
    )

    const view = await new ShowEpic(new EpicRepository(folder), () => Promise.resolve([])).execute({
      epic: 'one',
    })

    expect([view.stage, view.step]).toStrictEqual(['planning', 'prd'])
  })
})
