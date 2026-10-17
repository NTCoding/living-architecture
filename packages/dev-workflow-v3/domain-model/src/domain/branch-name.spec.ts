import { describe, expect, it } from 'vitest'
import { BranchName } from './branch-name'

describe('BranchName', () => {
  it('builds a branch from the issue number and title', () => {
    expect(BranchName.fromIssueNumberAndTitle(455, 'Add a review cycle').value()).toBe(
      'issue-455-add-a-review-cycle',
    )
  })

  it('drops punctuation and shortens a long title', () => {
    const branch = BranchName.fromIssueNumberAndTitle(
      455,
      `Review: it's done! ${'word '.repeat(30)}`,
    )

    expect(branch.value().startsWith('issue-455-review-it-s-done-word')).toBe(true)
    expect(branch.value().length).toBeLessThanOrEqual('issue-455-'.length + 60)
  })

  it('drops a trailing dash when the title is cut at sixty characters', () => {
    const branch = BranchName.fromIssueNumberAndTitle(7, `${'a'.repeat(59)} b c`)

    expect(branch.value()).toBe(`issue-7-${'a'.repeat(59)}`)
  })

  it('parses an existing branch name', () => {
    expect(BranchName.parse('issue-455-add-a-review-cycle').value()).toBe(
      'issue-455-add-a-review-cycle',
    )
  })

  it('rejects a blank branch name', () => {
    expect(() => BranchName.parse(' ')).toThrow('String must contain at least 1 character(s)')
  })
})
