import { describe, expect, it } from 'vitest'
import { InvalidReviewerName, Reviewer, Reviewers } from './reviewer'

describe('Reviewer', () => {
  it('accepts a known reviewer name', () => {
    expect(Reviewer.fromName('code-review').name()).toBe('code-review')
  })

  it('rejects an unknown reviewer name', () => {
    expect(() => Reviewer.fromName('design-review')).toThrow(InvalidReviewerName)
  })

  it('compares two reviewers by name', () => {
    expect(Reviewer.fromName('code-review').equals(Reviewer.fromName('code-review'))).toBe(true)
    expect(Reviewer.fromName('code-review').equals(Reviewer.fromName('bug-scanner'))).toBe(false)
  })
})

describe('Reviewers', () => {
  it('lists the three reviewers the workflow runs', () => {
    expect(
      Reviewers.singleton()
        .all()
        .map((reviewer) => reviewer.name()),
    ).toStrictEqual(['architecture-review', 'code-review', 'bug-scanner'])
  })

  it('parses a list of reviewer names', () => {
    expect(
      Reviewers.parse(['code-review'])
        .all()
        .map((reviewer) => reviewer.name()),
    ).toStrictEqual(['code-review'])
  })

  it('rejects a list that holds an unknown reviewer', () => {
    expect(() => Reviewers.parse(['design-review'])).toThrow(InvalidReviewerName)
  })

  it('says whether it includes a reviewer', () => {
    expect(Reviewers.singleton().includes(Reviewer.fromName('bug-scanner'))).toBe(true)
    expect(Reviewers.parse(['code-review']).includes(Reviewer.fromName('bug-scanner'))).toBe(false)
  })
})
