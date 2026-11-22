import { describe, expect, it } from 'vitest'
import { PullRequestWriter } from './pull-request-writer'

describe('PullRequestWriter', () => {
  it('is the pull-request-writer agent', () => {
    expect(PullRequestWriter.singleton().name()).toBe('pull-request-writer')
  })

  it('is the pull-request-writer agent', () => {
    expect(PullRequestWriter.singleton().name()).toBe('pull-request-writer')
  })

  it('carries the pull request writer brief', () => {
    expect(PullRequestWriter.singleton().brief()).toContain(
      'You are the pull request writer in a software factory workflow.',
    )
  })
})
