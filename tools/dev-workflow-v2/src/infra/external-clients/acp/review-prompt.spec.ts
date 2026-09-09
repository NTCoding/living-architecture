import { describe, it, expect } from 'vitest'
import { buildReviewPrompt } from './review-prompt'

describe('buildReviewPrompt', () => {
  it('instructs the reviewer to review the pull request and post inline feedback', () => {
    const prompt = buildReviewPrompt({ pullRequestNumber: 42, reviewer: 'code-review' })

    expect(prompt).toContain('Review pull request #42 as code-review.')
    expect(prompt).toContain('post all feedback as inline comments')
    expect(prompt).toContain('Prefix every comment with [code-review].')
  })

  it('instructs the reviewer to post an approval comment when feedback is resolved', () => {
    const prompt = buildReviewPrompt({ pullRequestNumber: 7, reviewer: 'bug-scanner' })

    expect(prompt).toContain('post a GitHub comment containing [bug-scanner] APPROVED')
    expect(prompt).toContain('Do not return findings or a verdict to the caller.')
  })

  it('uses the reviewer name and pull request number in the prefix', () => {
    const prompt = buildReviewPrompt({ pullRequestNumber: 123, reviewer: 'architecture-review' })

    expect(prompt).toContain('[architecture-review]')
    expect(prompt).toContain('#123')
  })
})
