import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DecisionFileError, DecisionRepository } from './decision-repository'

const decisionFile = [
  'id: d-2',
  'type: decision',
  'document: ARCH.md',
  'question: Will the merged graph be written to one file?',
  'answer: null',
  'followed: false',
  'outcome: null',
].join('\n')

const answeredFile = [
  'id: d-2',
  'type: decision',
  'document: ARCH.md',
  'question: Will the merged graph be written to one file?',
  'answer:',
  '  choice: proposal',
  '  chosen: Write one merged graph file per workspace.',
  '  reply: null',
  '  time: 2026-11-27T09:41:00Z',
  'followed: false',
  'outcome: null',
].join('\n')

function repoWithDecision(text: string): { repository: DecisionRepository; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-decision-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'd-2.yml'),
    text,
  )
  return { repository: new DecisionRepository(folder), folder }
}

describe('DecisionRepository', () => {
  it('loads a decision that waits for Nick', () => {
    const { repository } = repoWithDecision(decisionFile)

    const decision = repository.load('cross-repo-linking', 'd-2')

    expect([decision.id(), decision.document()]).toStrictEqual(['d-2', 'ARCH.md'])
    expect(decision.waitsFor()).toBe('nick')
    expect(decision.answer()).toBeNull()
  })

  it('loads the answer that Nick gave', () => {
    const { repository } = repoWithDecision(answeredFile)

    const answer = repository.load('cross-repo-linking', 'd-2').answer()

    expect(answer?.choice()).toBe('proposal')
    expect(answer?.chosen()).toBe('Write one merged graph file per workspace.')
    expect(answer?.reply()).toBeNull()
    expect(answer?.time()).toBe('2026-11-27T09:41:00Z')
  })

  it('writes the answer back in the shape of the file', () => {
    const { repository, folder } = repoWithDecision(decisionFile)
    const answered = repository.load('cross-repo-linking', 'd-2').answered({
      choice: 'reply',
      chosen: 'Ask Jo about the private repositories first.',
      reply: 'Ask Jo about the private repositories first.',
      time: '2026-11-27T09:41:00Z',
    })

    repository.save('cross-repo-linking', answered)

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'd-2.yml'),
      'utf8',
    )
    expect(written).toContain('type: decision')
    expect(written).toContain('choice: reply')
    expect(repository.load('cross-repo-linking', 'd-2').answer()?.reply()).toBe(
      'Ask Jo about the private repositories first.',
    )
    expect(written).toContain('followed: false')
  })

  it('writes a decision that nobody has answered yet', () => {
    const { repository } = repoWithDecision(decisionFile)

    repository.save('cross-repo-linking', repository.load('cross-repo-linking', 'd-2'))

    const written = readFileSync(
      join(
        repository['targetRepo'],
        'docs',
        'project',
        'PRD',
        'cross-repo-linking',
        'threads',
        'd-2.yml',
      ),
      'utf8',
    )
    expect(written).toContain('answer: null')
    expect(written).toContain('outcome: null')
  })

  it('reads a file that leaves the answer and the outcome out', () => {
    const { repository } = repoWithDecision(
      decisionFile.replace('answer: null\n', '').replace('outcome: null\n', ''),
    )

    const decision = repository.load('cross-repo-linking', 'd-2')

    expect(decision.answer()).toBeNull()
    expect(decision.outcome()).toBeNull()
  })

  it('refuses an outcome that a person wrote', () => {
    const closedByNick = answeredFile
      .replace('followed: false', 'followed: true')
      .replace('outcome: null', 'outcome:\n  closedBy: nick\n  time: 2026-11-27T10:02:00Z')
    const { repository } = repoWithDecision(closedByNick)

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(
      new DecisionFileError('The decision d-2 is closed by the agent: nick'),
    )
  })

  it('writes a decision that has been followed', () => {
    const { repository } = repoWithDecision(answeredFile)
    const followed = repository.load('cross-repo-linking', 'd-2').followed('2026-11-27T10:02:00Z')

    repository.save('cross-repo-linking', followed)

    expect(repository.load('cross-repo-linking', 'd-2').isFollowed()).toBe(true)
  })

  it('says which decision a missing file is', () => {
    const { repository } = repoWithDecision(decisionFile)

    expect(() => repository.load('cross-repo-linking', 'd-9')).toThrow(
      new DecisionFileError('There is no decision d-9 in cross-repo-linking.'),
    )
  })

  it('refuses a file that is not named after a decision', () => {
    const { repository } = repoWithDecision(decisionFile)

    expect(() => repository.load('cross-repo-linking', 'c-3')).toThrow(
      new DecisionFileError('A decision file is named d-1.yml or d-2.yml: c-3'),
    )
  })

  it('refuses a folder that is not a slug', () => {
    const { repository } = repoWithDecision(decisionFile)

    expect(() => repository.load('Cross Repo', 'd-2')).toThrow(
      new DecisionFileError(
        'An epic folder is a slug of lower case letters, digits and dashes: Cross Repo',
      ),
    )
  })

  it('refuses a file that is not YAML', () => {
    const { repository } = repoWithDecision('id: [\n  unclosed')

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(DecisionFileError)
  })

  it('refuses a file that is not a mapping', () => {
    const { repository } = repoWithDecision('- d-2\n- ARCH.md')

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(
      new DecisionFileError('The file of d-2 is not a mapping.'),
    )
  })

  it('refuses an answer that is not a mapping', () => {
    const { repository } = repoWithDecision(decisionFile.replace('answer: null', 'answer: 3'))

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(
      new DecisionFileError('The answer of d-2 is a mapping.'),
    )
  })

  it('refuses an outcome that is not a mapping', () => {
    const { repository } = repoWithDecision(decisionFile.replace('outcome: null', 'outcome: 3'))

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(
      new DecisionFileError('The outcome of d-2 is a mapping.'),
    )
  })

  it('refuses a question that is missing', () => {
    const { repository } = repoWithDecision(decisionFile.replace(/^question: .*\n/m, ''))

    expect(() => repository.load('cross-repo-linking', 'd-2')).toThrow(
      new DecisionFileError('The question of d-2 is a non-empty string.'),
    )
  })
})
