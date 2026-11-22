import { describe, expect, it } from 'vitest'
import { InvalidPullRequestDraft, PullRequestDraft } from './pull-request-draft'

const goodDescription = [
  '## Problem',
  '',
  'The workflow had no review cycle, so a pull request reached a person without an',
  'architecture review first. This adds the cycle and the three reviewer steps.',
].join('\n')

describe('PullRequestDraft', () => {
  it('builds a draft that is not valid so the caller can read what is wrong', () => {
    const draft = PullRequestDraft.from({ title: 'Added a review cycle', description: 'short' })

    expect(draft.validate().isValid()).toBe(false)
    expect(draft.title()).toBe('Added a review cycle')
  })

  it('accepts a conventional title and a description with substance', () => {
    const draft = PullRequestDraft.parse({
      title: 'feat(workflow): add the review cycle',
      description: goodDescription,
    })

    expect(draft.title()).toBe('feat(workflow): add the review cycle')
    expect(draft.description()).toBe(goodDescription)
    expect(draft.validate().isValid()).toBe(true)
  })

  it('gives no reasons when the draft is valid', () => {
    const draft = PullRequestDraft.parse({
      title: 'feat: add the review cycle',
      description: goodDescription,
    })

    expect(draft.validate().reasons()).toStrictEqual([])
  })

  it('rejects a title without a conventional commit type', () => {
    expect(() =>
      PullRequestDraft.parse({ title: 'Add the review cycle', description: goodDescription }),
    ).toThrow('The title needs a conventional commit type')
  })

  it('rejects a title longer than the limit', () => {
    const draftTitle = `feat: ${'a'.repeat(70)}`

    expect(() =>
      PullRequestDraft.parse({ title: draftTitle, description: goodDescription }),
    ).toThrow('The title is longer than 72 characters.')
  })

  it('rejects a title that ends with a full stop', () => {
    expect(() =>
      PullRequestDraft.parse({
        title: 'feat(workflow): add the review cycle.',
        description: goodDescription,
      }),
    ).toThrow('The title ends with a full stop.')
  })

  it('rejects a description that is too short', () => {
    expect(() =>
      PullRequestDraft.parse({ title: 'feat: add the review cycle', description: 'Short.' }),
    ).toThrow(InvalidPullRequestDraft)
  })

  it('rejects a description that is only whitespace', () => {
    expect(() =>
      PullRequestDraft.parse({
        title: 'feat: add the review cycle',
        description: ' '.repeat(120),
      }),
    ).toThrow('The description is shorter than 100 characters.')
  })
})
