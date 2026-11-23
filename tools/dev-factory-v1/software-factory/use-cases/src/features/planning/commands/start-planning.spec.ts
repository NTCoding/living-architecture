import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidIdea } from '@dev-factory-v1/domain-model/domain/planning/idea'
import { InboxFile } from '../adapters/inbox/inbox-file'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { IdeaRepository } from '../data-access/idea/idea-repository'
import { StartPlanning } from './start-planning'

const ideaFile = [
  '---',
  'title: Cross-repo linking',
  'status: captured',
  'need: definitely-needed',
  'epic: null',
  '---',
  '',
  '**Source:** planning discussion.',
].join('\n')

function factoryIn(text: string): { startPlanning: StartPlanning; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-start-planning-'))
  mkdirSync(join(folder, 'project-memory', 'ideas', 'cross-repo-linking'), { recursive: true })
  mkdirSync(join(folder, '.factory'), { recursive: true })
  writeFileSync(join(folder, 'project-memory', 'ideas', 'cross-repo-linking', 'idea.md'), text)
  return {
    folder,
    startPlanning: new StartPlanning(
      new IdeaRepository(folder),
      new EpicRepository(folder),
      new InboxFile(folder),
      () => '2026-11-24T09:02:00Z',
    ),
  }
}

describe('StartPlanning', () => {
  it('puts the epic at the first step and says which step', () => {
    const { startPlanning } = factoryIn(ideaFile)

    const result = startPlanning.execute({ idea: 'cross-repo-linking' })

    expect(result).toStrictEqual({ epic: 'cross-repo-linking', step: 'problem-definition' })
  })

  it('writes the epic with the idea it came from', () => {
    const { startPlanning, folder } = factoryIn(ideaFile)

    startPlanning.execute({ idea: 'cross-repo-linking' })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('title: Cross-repo linking')
    expect(written).toContain('idea: cross-repo-linking')
    expect(written).toContain('step: problem-definition')
    expect(written).toContain('event: started')
  })

  it('marks the idea as exploring', () => {
    const { startPlanning, folder } = factoryIn(ideaFile)

    startPlanning.execute({ idea: 'cross-repo-linking' })

    const written = readFileSync(
      join(folder, 'project-memory', 'ideas', 'cross-repo-linking', 'idea.md'),
      'utf8',
    )
    expect(written).toContain('status: exploring')
    expect(written).toContain('epic: cross-repo-linking')
  })

  it('puts a planning-started event in the inbox', () => {
    const { startPlanning, folder } = factoryIn(ideaFile)

    startPlanning.execute({ idea: 'cross-repo-linking' })

    const events = readEventsIn(folder)
    expect(events).toStrictEqual([
      {
        kind: 'planning-started',
        n: 1,
        time: '2026-11-24T09:02:00Z',
        epic: 'cross-repo-linking',
      },
    ])
  })

  it('refuses an idea that has already started planning', () => {
    const { startPlanning, folder } = factoryIn(ideaFile)
    startPlanning.execute({ idea: 'cross-repo-linking' })

    expect(() => startPlanning.execute({ idea: 'cross-repo-linking' })).toThrow(InvalidIdea)
    expect(
      existsSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml')),
    ).toBe(true)
  })
})

function readEventsIn(folder: string): unknown {
  const text = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
  return JSON.parse(`[${text.trim().split('\n').join(',')}]`)
}
