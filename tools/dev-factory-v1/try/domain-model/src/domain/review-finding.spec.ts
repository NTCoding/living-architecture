import { describe, expect, it } from 'vitest'
import { ReviewFinding } from './review-finding'
import { codeReviewer, reviewFinding } from './__fixtures__/review-test-fixtures'

describe('ReviewFinding', () => {
  it('keeps the file, the line, the rule and the summary', () => {
    const finding = reviewFinding()

    expect(finding.reviewer().name()).toBe('code-review')
    expect(finding.file()).toBe('src/order.ts')
    expect(finding.line()).toBe(12)
    expect([finding.rule(), finding.summary()]).toStrictEqual([
      'SD-005',
      'A domain decision sits in the adapter.',
    ])
  })

  it('names the rule at the start of the comment body when there is one', () => {
    expect(reviewFinding().body()).toBe('**SD-005** A domain decision sits in the adapter.')
  })

  it('uses the plain summary when no rule applies', () => {
    expect(reviewFinding({ rule: null }).body()).toBe('A domain decision sits in the adapter.')
  })

  it('rejects a finding without a file, a line or a summary', () => {
    const finding = reviewFinding()

    expect(() =>
      ReviewFinding.parse({
        reviewer: codeReviewer,
        file: '  ',
        line: finding.line(),
        rule: null,
        summary: finding.summary(),
      }),
    ).toThrow('String must contain at least 1 character(s)')
    expect(() =>
      ReviewFinding.parse({
        reviewer: codeReviewer,
        file: finding.file(),
        line: 0,
        rule: null,
        summary: finding.summary(),
      }),
    ).toThrow('Number must be greater than 0')
    expect(() =>
      ReviewFinding.parse({
        reviewer: codeReviewer,
        file: finding.file(),
        line: finding.line(),
        rule: null,
        summary: ' ',
      }),
    ).toThrow('String must contain at least 1 character(s)')
  })

  it('rejects an empty rule name when a rule is given', () => {
    expect(() => reviewFinding({ rule: ' ' })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
