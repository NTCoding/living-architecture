import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PlanningFoldersLoader } from './planning-folders-loader'

function factoryWith(folders: readonly { path: string; file: string | null }[]): string {
  const folder = mkdtempSync(join(tmpdir(), 'factory-folders-'))
  for (const entry of folders) {
    mkdirSync(join(folder, entry.path), { recursive: true })
    if (entry.file !== null) writeFileSync(join(folder, entry.path, entry.file), 'title: A title')
  }
  return folder
}

describe('PlanningFoldersLoader', () => {
  it('reads the epics and the ideas that have their file', () => {
    const folder = factoryWith([
      { path: join('docs', 'project', 'PRD', 'cross-repo-linking'), file: 'epic.yml' },
      { path: join('docs', 'project', 'PRD', 'archived'), file: null },
      { path: join('project-memory', 'ideas', 'preset-workflows'), file: 'idea.md' },
    ])

    expect(new PlanningFoldersLoader(folder).load()).toStrictEqual({
      epics: ['cross-repo-linking'],
      ideas: ['preset-workflows'],
    })
  })

  it('reads nothing from a repo that has neither folder', () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-empty-'))

    expect(new PlanningFoldersLoader(folder).load()).toStrictEqual({ epics: [], ideas: [] })
  })
})
