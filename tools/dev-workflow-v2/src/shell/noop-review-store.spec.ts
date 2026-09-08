import { describe, expect, it } from 'vitest'
import { noopReviewStore } from './noop-review-store'

const expectedMethodNames = [
  'cancelReviewBundle',
  'claimReviewBundle',
  'claimReviewExecution',
  'completeReviewAgent',
  'completeReviewBundle',
  'failReviewBundle',
  'findActiveReviewBundle',
  'getReviewBundle',
  'listReviewAgents',
  'markReviewAgentRunning',
  'markReviewBundleRunning',
  'resumeReviewAgent',
]

describe('noopReviewStore', () => {
  it('provides a method for every entry of the platform review job store contract', () => {
    expect(Object.keys(noopReviewStore())).toStrictEqual(expectedMethodNames)
  })

  it('throws the exact explanation when a method is called', () => {
    expect(() => noopReviewStore().claimReviewExecution('bundle-1')).toThrow(
      'The platform review job store is not used by this workflow; reviews are consumer-owned.',
    )
  })
})
