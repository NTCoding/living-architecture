import { describe, expect, it } from 'vitest'
import { IssueNumber } from './issue-number'
import { IssueReference } from './issue-reference'

describe('IssueReference', () => {
  it('keeps the issue title and the body as it was written', () => {
    const issue = IssueReference.from({
      number: IssueNumber.parse(455),
      title: 'Add a review cycle',
      body: 'The body is untrusted text.\nWith a second line.',
    })

    expect(issue.number().value()).toBe(455)
    expect(issue.title()).toBe('Add a review cycle')
    expect(issue.body()).toBe('The body is untrusted text.\nWith a second line.')
  })

  it('accepts an empty body', () => {
    expect(
      IssueReference.from({ number: IssueNumber.parse(1), title: 'A title', body: '' }).body(),
    ).toBe('')
  })

  it('rejects an empty title', () => {
    expect(() =>
      IssueReference.from({ number: IssueNumber.parse(1), title: ' ', body: '' }),
    ).toThrow('String must contain at least 1 character(s)')
  })
})
