import { describe, expect, it } from 'vitest'
import { PullRequestReference } from './pull-request-reference'

describe('PullRequestReference', () => {
  it('keeps the pull request number and url', () => {
    const pullRequest = PullRequestReference.from({
      number: 549,
      url: 'https://github.com/NTCoding/living-architecture/pull/549',
    })

    expect(pullRequest.number()).toBe(549)
    expect(pullRequest.url()).toBe('https://github.com/NTCoding/living-architecture/pull/549')
  })

  it('rejects a number that is not positive and a url that is not a url', () => {
    expect(() => PullRequestReference.from({ number: 0, url: 'https://example.com' })).toThrow(
      'Number must be greater than 0',
    )
    expect(() => PullRequestReference.from({ number: 549, url: 'not a url' })).toThrow(
      'Invalid url',
    )
  })
})
