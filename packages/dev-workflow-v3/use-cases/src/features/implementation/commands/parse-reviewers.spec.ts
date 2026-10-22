import { describe, expect, it } from 'vitest'
import { ParseReviewers } from './parse-reviewers'
import { InvalidReviewerName } from '@living-architecture/dev-workflow-v3-domain-model'

describe('ParseReviewers', () => {
  it('parses reviewer names into their canonical form', () => {
    const result = new ParseReviewers().execute({ names: ['code-review', 'bug-scanner'] })

    expect(result.reviewers).toStrictEqual(['code-review', 'bug-scanner'])
  })

  it('falls back to every reviewer the domain knows when no names are given', () => {
    const result = new ParseReviewers().execute({ names: undefined })

    expect(result.reviewers).toStrictEqual(['architecture-review', 'code-review', 'bug-scanner'])
  })

  it('throws for an unknown reviewer name', () => {
    expect(() => new ParseReviewers().execute({ names: ['code-review', 'vibes'] })).toThrow(
      InvalidReviewerName,
    )
  })
})
