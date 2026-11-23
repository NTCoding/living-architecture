import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { IdeaRepository } from '../data-access/idea/idea-repository'
import { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'
import { ShowOverviewBoard } from './overview-board'

type Epic = { readonly slug: string; readonly stage: string }

function boardOf(epics: readonly Epic[], ideas: readonly string[]): ShowOverviewBoard {
  const folder = mkdtempSync(join(tmpdir(), 'factory-overview-'))
  for (const epic of epics) {
    const path = join(folder, 'docs', 'project', 'PRD', epic.slug)
    mkdirSync(path, { recursive: true })
    const step = epic.stage === 'planning' ? 'step: architecture\n' : ''
    writeFileSync(
      join(path, 'epic.yml'),
      `title: ${epic.slug}\nstage: ${epic.stage}\n${step}features: []\nhistory: []\n`,
    )
  }
  for (const idea of ideas) {
    const path = join(folder, 'project-memory', 'ideas', idea)
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'idea.md'),
      `---\ntitle: ${idea}\nstatus: captured\nneed: definitely-needed\nepic: null\n---\n`,
    )
  }
  return new ShowOverviewBoard(
    new PlanningFoldersLoader(folder),
    new IdeaRepository(folder),
    new EpicRepository(folder),
  )
}

describe('ShowOverviewBoard', () => {
  it('puts the captured ideas in the first column', () => {
    const board = boardOf([], ['preset-workflows']).execute({})

    expect(board.ideas).toStrictEqual([
      {
        slug: 'preset-workflows',
        title: 'preset-workflows',
        need: 'definitely-needed',
        action: 'start-planning',
      },
    ])
  })

  it('puts each epic in the column of its stage', () => {
    const board = boardOf(
      [
        { slug: 'one', stage: 'planning' },
        { slug: 'two', stage: 'in-progress' },
        { slug: 'three', stage: 'done' },
      ],
      [],
    ).execute({})

    expect(board.planning.map((epic) => epic.slug)).toStrictEqual(['one'])
    expect(board.inProgress.map((epic) => epic.slug)).toStrictEqual(['two'])
    expect(board.done.map((epic) => epic.slug)).toStrictEqual(['three'])
  })

  it('names the step of an epic that is being planned', () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-overview-step-'))
    const path = join(folder, 'docs', 'project', 'PRD', 'one')
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'epic.yml'),
      'title: One\nstage: planning\nstep: architecture\nfeatures: []\nhistory: []\n',
    )

    const board = new ShowOverviewBoard(
      new PlanningFoldersLoader(folder),
      new IdeaRepository(folder),
      new EpicRepository(folder),
    ).execute({})

    expect(board.planning).toStrictEqual([
      { slug: 'one', title: 'One', step: 'architecture', stories: 0 },
    ])
  })

  it('leaves out an idea that has started planning', () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-overview-started-'))
    const path = join(folder, 'project-memory', 'ideas', 'preset-workflows')
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'idea.md'),
      '---\ntitle: Preset workflows\nstatus: exploring\nneed: uncertain\nepic: preset\n---\n',
    )

    const board = new ShowOverviewBoard(
      new PlanningFoldersLoader(folder),
      new IdeaRepository(folder),
      new EpicRepository(folder),
    ).execute({})

    expect(board.ideas).toStrictEqual([])
  })
})
