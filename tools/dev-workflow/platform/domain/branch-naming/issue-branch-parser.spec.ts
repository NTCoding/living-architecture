import {
  describe, it, expect 
} from 'vitest'
import { parseIssueNumber } from './issue-branch-parser'

describe('parseIssueNumber', () => {
  it('extracts issue number from standard issue branch', () => {
    expect(parseIssueNumber('issue-123')).toBe(123)
  })

  it('extracts issue number from branch with suffix', () => {
    expect(parseIssueNumber('issue-456-add-feature')).toBe(456)
  })

  it('returns undefined for non-issue branch', () => {
    expect(parseIssueNumber('main')).toBeUndefined()
  })

  it('returns undefined for branch without issue pattern', () => {
    expect(parseIssueNumber('feature/add-login')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(parseIssueNumber('')).toBeUndefined()
  })
})
