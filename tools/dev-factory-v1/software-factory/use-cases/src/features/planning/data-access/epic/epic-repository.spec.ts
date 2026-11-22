import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Epic, PlanningStep } from '@dev-factory-v1/domain-model'
import { EpicFileError, EpicRepository } from './epic-repository'

function repoWithEpic(text: string): { repository: EpicRepository; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-epic-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking'), { recursive: true })
  writeFileSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'), text)
  return { repository: new EpicRepository(folder), folder }
}

const epicFile = [
  'title: Cross-repo linking',
  'idea: cross-repo-linking',
  'stage: planning',
  'step: architecture',
  'history:',
  '  - event: approved',
  '    step: prd',
  '    time: 2026-11-26T11:03:00Z',
  'features:',
  '  - id: M1',
  '    title: The graph merges',
  '    stories:',
  '      - 901',
  '      - 902',
].join('\n')

describe('EpicRepository', () => {
  it('loads the epic from its epic.yml', () => {
    const { repository } = repoWithEpic(epicFile)

    const epic = repository.load('cross-repo-linking')

    expect([epic.title(), epic.idea()]).toStrictEqual(['Cross-repo linking', 'cross-repo-linking'])
    expect(epic.stage()).toStrictEqual({
      kind: 'planning',
      step: PlanningStep.from('architecture'),
    })
    expect(epic.stories()).toStrictEqual([901, 902])
    expect(epic.history()).toStrictEqual([
      { event: 'approved', step: 'prd', time: '2026-11-26T11:03:00Z', reason: null },
    ])
  })

  it('reads an epic that is not being planned', () => {
    const { repository } = repoWithEpic('title: Cross-repo linking\nstage: in-progress\n')

    expect(repository.load('cross-repo-linking').stage()).toStrictEqual({ kind: 'in-progress' })
  })

  it('says so when the epic has no file', () => {
    const { repository } = repoWithEpic(epicFile)

    expect(() => repository.load('phase-99')).toThrow('There is no epic.yml for phase-99')
  })

  it('loads an entry in the history that says why the epic went back', () => {
    const { repository } = repoWithEpic(
      [
        'title: Cross-repo linking',
        'stage: planning',
        'step: prd',
        'history:',
        '  - event: sent-back',
        '    step: prd',
        '    time: 2026-11-27T10:15:00Z',
        '    reason: The data model is wrong.',
      ].join('\n'),
    )

    expect(repository.load('cross-repo-linking').history()).toStrictEqual([
      {
        event: 'sent-back',
        step: 'prd',
        time: '2026-11-27T10:15:00Z',
        reason: 'The data model is wrong.',
      },
    ])
  })

  it('saves an epic with a history', () => {
    const { repository, folder } = repoWithEpic(epicFile)
    const sentBack = repository
      .load('cross-repo-linking')
      .sendBack(
        PlanningStep.from('problem-definition'),
        'The problem is not clear.',
        '2026-11-27T10:15:00Z',
      )

    repository.save('cross-repo-linking', sentBack)

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('event: sent-back')
    expect(written).toContain('reason: The problem is not clear.')
    expect(repository.load('cross-repo-linking').stage()).toStrictEqual(sentBack.stage())
  })

  it('saves what it loads', () => {
    const { repository, folder } = repoWithEpic(epicFile)
    const epic = repository.load('cross-repo-linking')

    repository.save('cross-repo-linking', epic)

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('title: Cross-repo linking')
    expect(written).toContain('step: architecture')
    expect(repository.load('cross-repo-linking').stage()).toStrictEqual(epic.stage())
  })

  it('writes the step only while the epic is being planned', () => {
    const { repository, folder } = repoWithEpic(epicFile)

    repository.save(
      'cross-repo-linking',
      Epic.from({
        title: 'Cross-repo linking',
        idea: null,
        stage: { kind: 'in-progress' },
        features: [],
        history: [],
      }),
    )

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('stage: in-progress')
    expect(written).not.toContain('step:')
  })

  it('creates the folder of a new epic', () => {
    const { repository, folder } = repoWithEpic(epicFile)

    repository.save(
      'phase-14-cross-repo-linking',
      Epic.from({
        title: 'Phase 14',
        idea: 'cross-repo-linking',
        stage: { kind: 'planning', step: PlanningStep.from('problem-definition') },
        features: [],
        history: [],
      }),
    )

    expect(
      readFileSync(
        join(folder, 'docs', 'project', 'PRD', 'phase-14-cross-repo-linking', 'epic.yml'),
        'utf8',
      ),
    ).toContain('step: problem-definition')
  })

  it('refuses a slug that is not a folder name', () => {
    const { repository } = repoWithEpic(epicFile)

    expect(() => repository.load('Cross Repo')).toThrow('An epic folder is a slug')
  })

  it('says when the file is not YAML', () => {
    const { repository } = repoWithEpic('title: [unclosed')

    expect(() => repository.load('cross-repo-linking')).toThrow(EpicFileError)
  })

  it('says when the file is not a mapping', () => {
    const { repository } = repoWithEpic('- one\n- two')

    expect(() => repository.load('cross-repo-linking')).toThrow('is not a mapping')
  })

  it('says when a stage is not one the factory knows', () => {
    const { repository } = repoWithEpic('title: Cross-repo linking\nstage: nearly-done\n')

    expect(() => repository.load('cross-repo-linking')).toThrow(
      'The stage of cross-repo-linking is one of',
    )
  })

  it('says when a planning epic has no step', () => {
    const { repository } = repoWithEpic('title: Cross-repo linking\nstage: planning\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('A planning step is one of')
  })

  it('says when the features are not a list', () => {
    const { repository } = repoWithEpic('title: Cross-repo linking\nstage: done\nfeatures: M1\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('The features of')
  })

  it('says when a feature is not a mapping', () => {
    const { repository } = repoWithEpic('title: A\nstage: done\nfeatures:\n  - M1\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('A feature of')
  })

  it('reads a feature that has no stories yet', () => {
    const { repository } = repoWithEpic(
      'title: A\nstage: done\nfeatures:\n  - id: M1\n    title: The graph merges\n',
    )

    expect(repository.load('cross-repo-linking').features()).toStrictEqual([
      { id: 'M1', title: 'The graph merges', stories: [] },
    ])
  })

  it('reads an entry in the history that has no step', () => {
    const { repository } = repoWithEpic(
      [
        'title: A',
        'stage: done',
        'history:',
        '  - event: finished',
        '    time: 2026-11-27T10:15:00Z',
      ].join('\n'),
    )

    expect(repository.load('cross-repo-linking').history()).toStrictEqual([
      { event: 'finished', step: null, time: '2026-11-27T10:15:00Z', reason: null },
    ])
  })

  it('saves an entry in the history that has no step', () => {
    const { repository, folder } = repoWithEpic(epicFile)
    const finished = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'done' },
      features: [],
      history: [{ event: 'finished', step: null, time: '2026-11-27T10:15:00Z', reason: null }],
    })

    repository.save('cross-repo-linking', finished)

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('event: finished')
    expect(written).not.toContain('reason:')
  })

  it('says when a feature has no title', () => {
    const { repository } = repoWithEpic(
      'title: A\nstage: done\nfeatures:\n  - id: M1\n    stories: [1]\n',
    )

    expect(() => repository.load('cross-repo-linking')).toThrow(
      'feature title of cross-repo-linking',
    )
  })

  it('says when the history is not a list', () => {
    const { repository } = repoWithEpic('title: A\nstage: done\nhistory: 4\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('The history of')
  })

  it('says when an entry in the history is not a mapping', () => {
    const { repository } = repoWithEpic('title: A\nstage: done\nhistory:\n  - approved\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('An entry in the history of')
  })

  it('says when the title is missing', () => {
    const { repository } = repoWithEpic('stage: done\n')

    expect(() => repository.load('cross-repo-linking')).toThrow('The title of cross-repo-linking')
  })
})
