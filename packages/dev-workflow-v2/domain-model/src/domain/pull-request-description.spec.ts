import { assert, describe, expect, it } from 'vitest'
import { CommitType, PullRequestDescription, PullRequestTitle } from './pull-request-description'

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
      reason: 'Expected --title to not end with a full stop.',
    })
  })

  it('rejects an empty title', () => {
    expect(PullRequestTitle.from('')).toStrictEqual({
      ok: false,
      reason: 'Expected non-empty value for --title.',
    })
  })

  it('rejects an uppercase title', () => {
    expect(PullRequestTitle.from('Ready pull request')).toStrictEqual({
      ok: false,
      reason: 'Expected --title to use lower case.',
    })
  })
})

describe('CommitType', () => {
  it('rejects an unsupported commit type', () => {
    expect(CommitType.from('unsupported')).toStrictEqual({
      ok: false,
      reason:
        'Expected --commit-type to be one of: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.',
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
      reason: 'Expected --description to be at least 100 characters.',
    })
  })

  it('rejects a whitespace padded description below 100 trimmed characters', () => {
    expect(PullRequestDescription.from(`          ${'A'.repeat(80)}          `)).toStrictEqual({
      ok: false,
      reason: 'Expected --description to be at least 100 characters.',
    })
  })
})
