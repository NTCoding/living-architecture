import { describe, expect, it } from 'vitest'
import { nextRun } from './next-run'

describe('nextRun', () => {
  it('names the first run of an issue after the issue', () => {
    expect(nextRun([], 548)).toStrictEqual({ runId: 'issue-548', attempt: 1 })
  })

  it('leaves the other issues alone', () => {
    expect(nextRun(['issue-547', 'issue-547-2'], 548)).toStrictEqual({
      runId: 'issue-548',
      attempt: 1,
    })
  })

  it('adds the second attempt when the first one exists', () => {
    expect(nextRun(['issue-548'], 548)).toStrictEqual({ runId: 'issue-548-2', attempt: 2 })
  })

  it('counts from the highest attempt rather than from the number of runs', () => {
    expect(nextRun(['issue-548', 'issue-548-2', 'issue-548-5'], 548)).toStrictEqual({
      runId: 'issue-548-6',
      attempt: 6,
    })
  })

  it('ignores a run of the issue whose suffix is not a number', () => {
    expect(nextRun(['issue-548', 'issue-548-later'], 548)).toStrictEqual({
      runId: 'issue-548-2',
      attempt: 2,
    })
  })

  it('treats a prefix that is not an attempt as the first attempt', () => {
    expect(nextRun(['issue-5480'], 548)).toStrictEqual({ runId: 'issue-548', attempt: 1 })
  })

  it('treats a zero suffix as the first attempt', () => {
    expect(nextRun(['issue-548', 'issue-548-0'], 548)).toStrictEqual({
      runId: 'issue-548-2',
      attempt: 2,
    })
  })
})
