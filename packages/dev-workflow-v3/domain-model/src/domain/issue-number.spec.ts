import { describe, expect, it } from 'vitest'
import { InvalidIssueNumber, IssueNumber } from './issue-number'

describe('IssueNumber', () => {
  it('parses a positive integer', () => {
    expect(IssueNumber.parse(455).value()).toBe(455)
  })

  it('parses an issue number typed at the command line', () => {
    expect(IssueNumber.parseFromText(' 455 ').value()).toBe(455)
  })

  it('rejects text that is not a number', () => {
    expect(() => IssueNumber.parseFromText('four five five')).toThrow(InvalidIssueNumber)
  })

  it('rejects a number that is not a positive integer', () => {
    expect(() => IssueNumber.parse(0)).toThrow(InvalidIssueNumber)
    expect(() => IssueNumber.parse(1.5)).toThrow(InvalidIssueNumber)
  })

  it('derives the run id from the issue number', () => {
    expect(IssueNumber.parse(455).runId()).toBe('issue-455')
    expect(IssueNumber.parse(455).toString()).toBe('455')
  })
})
