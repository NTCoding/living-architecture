import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'
import { ShowPlanningBoard } from './planning-board'

function boardOf(epics: readonly { slug: string; step: string }[]): ShowPlanningBoard {
  const folder = mkdtempSync(join(tmpdir(), 'factory-planning-board-'))
  for (const epic of epics) {
    const path = join(folder, 'docs', 'project', 'PRD', epic.slug)
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'epic.yml'),
      `title: ${epic.slug}\nstage: planning\nstep: ${epic.step}\nfeatures: []\nhistory: []\n`,
    )
  }
  return new ShowPlanningBoard(new PlanningFoldersLoader(folder), new EpicRepository(folder))
}

describe('ShowPlanningBoard', () => {
  it('has a column for each of the 6 steps', () => {
    const board = boardOf([]).execute({})

    expect(board.columns.map((column) => column.step)).toStrictEqual([
      'problem-definition',
      'solution-exploration',
      'prd',
      'architecture',
      'dogfooding',
      'delivery-planning',
    ])
    expect(board.columns.map((column) => column.epics)).toStrictEqual([[], [], [], [], [], []])
  })

  it('puts an epic in the column of its step', () => {
    const board = boardOf([{ slug: 'one', step: 'prd' }]).execute({})

    expect(board.columns.find((column) => column.step === 'prd')?.epics).toStrictEqual([
      { slug: 'one', title: 'one' },
    ])
  })

  it('leaves out an epic that has finished planning', () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-planning-board-done-'))
    const path = join(folder, 'docs', 'project', 'PRD', 'one')
    mkdirSync(path, { recursive: true })
    writeFileSync(
      join(path, 'epic.yml'),
      'title: One\nstage: in-progress\nfeatures: []\nhistory: []\n',
    )

    const board = new ShowPlanningBoard(
      new PlanningFoldersLoader(folder),
      new EpicRepository(folder),
    ).execute({})

    expect(board.columns.flatMap((column) => column.epics)).toStrictEqual([])
  })
})
