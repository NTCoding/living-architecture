import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidIdea } from '@dev-factory-v1/domain-model/domain/planning/idea'
import { IdeaRepository } from '../data-access/idea/idea-repository'
import { CaptureIdea } from './capture-idea'

function emptyFactory(): { captureIdea: CaptureIdea; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-capture-'))
  return { folder, captureIdea: new CaptureIdea(new IdeaRepository(folder)) }
}

describe('CaptureIdea', () => {
  it('captures the idea as uncertain', () => {
    const { captureIdea } = emptyFactory()

    const result = captureIdea.execute({
      slug: 'cross-repo-linking',
      title: 'Cross-repo linking',
      summary: 'Planning discussion.',
    })

    expect(result).toStrictEqual({ idea: 'cross-repo-linking', status: 'captured' })
  })

  it('writes the idea with its front matter and its summary', () => {
    const { captureIdea, folder } = emptyFactory()

    captureIdea.execute({
      slug: 'cross-repo-linking',
      title: 'Cross-repo linking',
      summary: 'Planning discussion.',
    })

    const written = readFileSync(
      join(folder, 'project-memory', 'ideas', 'cross-repo-linking', 'idea.md'),
      'utf8',
    )
    expect(written).toContain('title: Cross-repo linking')
    expect(written).toContain('status: captured')
    expect(written).toContain('need: uncertain')
    expect(written).toContain('**Source:** Planning discussion.')
  })

  it('refuses a title that is empty', () => {
    const { captureIdea } = emptyFactory()

    expect(() =>
      captureIdea.execute({ slug: 'cross-repo-linking', title: '  ', summary: 'Why not.' }),
    ).toThrow(InvalidIdea)
  })
})
