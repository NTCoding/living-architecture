import { assert, describe, expect, it } from 'vitest'
import {
  CommitScope,
  CommitType,
  PullRequestCreationDetails,
  PullRequestDescription,
  PullRequestTitle,
} from './pull-request-description'

const VALID_DESCRIPTION = 'A'.repeat(100)

describe('CommitType', () => {
  it('accepts every conventional commit type', () => {
    for (const commitType of [
      'build',
      'chore',
      'ci',
      'docs',
      'feat',
      'fix',
      'perf',
      'refactor',
      'revert',
      'style',
      'test',
    ]) {
      const result = CommitType.from(commitType)
      assert(result.ok)
      expect(result.value.name()).toBe(commitType)
    }
  })

  it('rejects an unsupported commit type', () => {
    expect(CommitType.from('unsupported')).toStrictEqual({
      ok: false,
      type: 'unsupported-commit-type',
      supportedNames: [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    })
  })
})

describe('CommitScope', () => {
  it('accepts free text that is non-empty, single-line, and at most 20 characters', () => {
    const result = CommitScope.from('riviere extract ts')
    assert(result.ok)
    expect(result.value.value()).toBe('riviere extract ts')
    expect(CommitScope.from('A'.repeat(20)).ok).toBe(true)
  })

  it.each(['', '   ', 'workflow\nstate', 'workflow\rstate', 'A'.repeat(21)])(
    'rejects an invalid scope',
    (scope) => {
      expect(CommitScope.from(scope)).toStrictEqual({
        ok: false,
        type: 'invalid-commit-scope',
      })
    },
  )
})

describe('PullRequestTitle', () => {
  it('exposes the validated title value', () => {
    const result = PullRequestTitle.from('ready pull request')
    assert(result.ok)
    expect(result.value.value()).toBe('ready pull request')
  })

  it('rejects a title ending with a full stop', () => {
    expect(PullRequestTitle.from('ready pull request.')).toStrictEqual({
      ok: false,
      type: 'pull-request-title-ends-with-full-stop',
    })
  })

  it('rejects an empty title', () => {
    expect(PullRequestTitle.from('')).toStrictEqual({
      ok: false,
      type: 'empty-pull-request-title',
    })
  })

  it('rejects an uppercase title', () => {
    expect(PullRequestTitle.from('Ready pull request')).toStrictEqual({
      ok: false,
      type: 'pull-request-title-has-uppercase',
    })
  })
})

describe('PullRequestDescription', () => {
  it('exposes the validated description value', () => {
    const result = PullRequestDescription.from(VALID_DESCRIPTION)
    assert(result.ok)
    expect(result.value.value()).toBe(VALID_DESCRIPTION)
  })

  it('rejects a description shorter than 100 characters', () => {
    expect(PullRequestDescription.from('A'.repeat(99))).toStrictEqual({
      ok: false,
      type: 'pull-request-description-too-short',
    })
  })

  it('rejects a whitespace padded description below 100 trimmed characters', () => {
    expect(PullRequestDescription.from(`          ${'A'.repeat(80)}          `)).toStrictEqual({
      ok: false,
      type: 'pull-request-description-too-short',
    })
  })
})

const VALID_PULL_REQUEST_CREATION_INPUT = {
  commitType: 'feat',
  commitScope: 'workflow',
  title: 'create pull request',
  description: VALID_DESCRIPTION,
  problem: 'Problem',
  acceptanceCriteria: 'Criteria',
  keyChanges: 'Changes',
  architectureImpact: 'Impact',
  validation: 'Validation',
  notes: 'Notes',
}

describe('PullRequestCreationDetails', () => {
  it('constructs details from valid pull request input', () => {
    const result = PullRequestCreationDetails.from(VALID_PULL_REQUEST_CREATION_INPUT)

    assert(result.ok)
    expect(result.value.commitType.name()).toBe('feat')
    expect(result.value.commitScope.value()).toBe('workflow')
    expect(result.value.title.value()).toBe('create pull request')
  })

  it.each([
    { input: { commitType: 'unsupported' }, type: 'unsupported-commit-type' },
    { input: { commitScope: '' }, type: 'invalid-commit-scope' },
    { input: { title: 'Invalid title' }, type: 'pull-request-title-has-uppercase' },
    { input: { description: 'short' }, type: 'pull-request-description-too-short' },
    { input: { title: 'a'.repeat(90) }, type: 'composed-title-too-long' },
  ])('returns $type when $input is invalid', ({ input, type }) => {
    expect(
      PullRequestCreationDetails.from({ ...VALID_PULL_REQUEST_CREATION_INPUT, ...input }),
    ).toMatchObject({ ok: false, type })
  })
})
