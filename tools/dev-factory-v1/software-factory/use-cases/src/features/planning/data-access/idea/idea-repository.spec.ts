import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IdeaRepository } from './idea-repository'

const ideaFile = [
  '---',
  'title: Preset workflows',
  'status: captured',
  'need: definitely-needed',
  'epic: null',
  '---',
  '',
  '**Source:** planning discussion.',
  '',
  'A workflow that a team can start from.',
].join('\n')

function repoWithIdea(text: string): { repository: IdeaRepository; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-idea-'))
  mkdirSync(join(folder, 'project-memory', 'ideas', 'preset-workflows'), { recursive: true })
  writeFileSync(join(folder, 'project-memory', 'ideas', 'preset-workflows', 'idea.md'), text)
  return { repository: new IdeaRepository(folder), folder }
}

describe('IdeaRepository', () => {
  it('loads the 4 fields of the front matter', () => {
    const { repository } = repoWithIdea(ideaFile)

    expect(repository.load('preset-workflows').toFields()).toStrictEqual({
      title: 'Preset workflows',
      status: 'captured',
      need: 'definitely-needed',
      epic: null,
    })
  })

  it('leaves the prose below the front matter alone', () => {
    const { repository, folder } = repoWithIdea(ideaFile)
    const started = repository.load('preset-workflows').startPlanning('cross-repo-linking')

    repository.save('preset-workflows', started)

    const written = readFileSync(
      join(folder, 'project-memory', 'ideas', 'preset-workflows', 'idea.md'),
      'utf8',
    )
    expect(written).toContain('status: exploring')
    expect(written).toContain('a team can start from')
  })

  it('writes the epic the idea became', () => {
    const { repository } = repoWithIdea(ideaFile)

    repository.save('preset-workflows', repository.load('preset-workflows').startPlanning('preset'))

    expect(repository.load('preset-workflows').epic()).toBe('preset')
  })

  it('writes a new idea file', () => {
    const { repository, folder } = repoWithIdea(ideaFile)

    repository.save('ci-observability', repository.load('preset-workflows'))

    expect(
      readFileSync(join(folder, 'project-memory', 'ideas', 'ci-observability', 'idea.md'), 'utf8'),
    ).toContain('title: Preset workflows')
  })

  it('says so when the idea has no file', () => {
    const { repository } = repoWithIdea(ideaFile)

    expect(() => repository.load('unknown')).toThrow('There is no idea.md for unknown')
  })

  it('says when the file has no front matter', () => {
    const { repository } = repoWithIdea('# Just prose')

    expect(() => repository.load('preset-workflows')).toThrow('starts with its front matter')
  })

  it('says when the front matter is never closed', () => {
    const { repository } = repoWithIdea('---\ntitle: Preset workflows\n')

    expect(() => repository.load('preset-workflows')).toThrow('is never closed')
  })

  it('says when the front matter is not a mapping', () => {
    const { repository } = repoWithIdea('---\n- one\n- two\n---\n')

    expect(() => repository.load('preset-workflows')).toThrow('is a mapping')
  })

  it('says when the front matter is not YAML', () => {
    const { repository } = repoWithIdea('---\ntitle: [unclosed\n---\n')

    expect(() => repository.load('preset-workflows')).toThrow('is not YAML')
  })

  it('refuses an idea folder that is not a slug', () => {
    const { repository } = repoWithIdea(ideaFile)

    expect(() => repository.load('Preset Workflows')).toThrow('An idea folder is a slug')
  })

  it('says when the front matter has no title', () => {
    const { repository } = repoWithIdea('---\nstatus: captured\nneed: uncertain\n---\n')

    expect(() => repository.load('preset-workflows')).toThrow('has a title')
  })
})
