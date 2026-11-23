import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidEpic } from '@dev-factory-v1/domain-model'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { RecordStories } from './record-stories'

const epicFile = [
  'title: Cross-repo linking',
  'idea: cross-repo-linking',
  'stage: creating-stories',
  'history: []',
  'features: []',
].join('\n')

const features = [
  { id: 'M1', title: 'Builder API extension', stories: [901, 902] },
  { id: 'M2', title: 'Merge algorithm', stories: [903, 904, 905] },
]

function epicIn(text: string): { recordStories: RecordStories; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-record-stories-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking'), { recursive: true })
  writeFileSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'), text)
  const epics = new EpicRepository(folder)
  return { folder, recordStories: new RecordStories(epics, () => '2026-11-28T09:15:00Z') }
}

describe('RecordStories', () => {
  it('moves the epic to implementing its stories', () => {
    const { recordStories } = epicIn(epicFile)

    const result = recordStories.execute({ epic: 'cross-repo-linking', features })

    expect(result).toStrictEqual({
      epic: 'cross-repo-linking',
      stage: 'in-progress',
      stories: [901, 902, 903, 904, 905],
    })
  })

  it('writes the features and the history entry to the epic file', () => {
    const { recordStories, folder } = epicIn(epicFile)

    recordStories.execute({ epic: 'cross-repo-linking', features })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('stage: in-progress')
    expect(written).toContain('title: Merge algorithm')
    expect(written).toContain('event: stories-recorded')
    expect(written).toContain('time: 2026-11-28T09:15:00Z')
  })

  it('refuses to record stories while the epic is still being planned', () => {
    const { recordStories } = epicIn(
      epicFile.replace('stage: creating-stories', 'stage: planning\nstep: delivery-planning'),
    )

    expect(() => recordStories.execute({ epic: 'cross-repo-linking', features })).toThrow(
      new InvalidEpic(
        'The epic Cross-repo linking is at planning, so its stories cannot be recorded now.',
      ),
    )
  })
})
