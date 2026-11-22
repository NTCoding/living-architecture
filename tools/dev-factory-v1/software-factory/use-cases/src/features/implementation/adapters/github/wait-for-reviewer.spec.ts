import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { waitForReviewerWithGithub } from './wait-for-reviewer'

const aComment = JSON.stringify([
  {
    id: 4306,
    path: 'src/order.ts',
    line: 12,
    body: 'A rule.',
    commit_id: 'abc123',
    user: { login: 'coderabbitai' },
  },
])

const aReview = JSON.stringify([
  {
    state: 'CHANGES_REQUESTED',
    body: 'Fix this.',
    commit_id: 'abc123',
    user: { login: 'coderabbitai[bot]' },
  },
])

const noComments = '[]'
const noReviews = '[]'

describe('waitForReviewerWithGithub', () => {
  it('waits out the grace period and returns the review of the current commit', async () => {
    const waits: number[] = []
    const runCommand = fakeCommands([
      { stdout: aComment, stderr: '', exitCode: 0 },
      { stdout: aReview, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 3,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.reviewSeen).toBe(true)
    expect(feedback.verdict).toBe('changes-requested')
    expect(feedback.summary).toBe('Fix this.')
    expect(waits).toStrictEqual([1])
  })

  it('waits and then returns the review once coderabbit has reviewed the commit', async () => {
    const waits: number[] = []
    const runCommand = fakeCommands([
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: noReviews, stderr: '', exitCode: 0 },
      { stdout: aComment, stderr: '', exitCode: 0 },
      { stdout: aReview, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 3,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.reviewSeen).toBe(true)
    expect(waits).toHaveLength(2)
  })

  it('ignores reviews of earlier commits', async () => {
    const waits: number[] = []
    const staleReview = JSON.stringify([
      {
        state: 'APPROVED',
        body: 'Old commit.',
        commit_id: 'old-commit',
        user: { login: 'coderabbitai[bot]' },
      },
    ])
    const runCommand = fakeCommands([
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: staleReview, stderr: '', exitCode: 0 },
      { stdout: aComment, stderr: '', exitCode: 0 },
      { stdout: aReview, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 3,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.verdict).toBe('changes-requested')
    expect(waits.length).toBeGreaterThan(0)
  })

  it('tries again when the fetch fails, then returns the review', async () => {
    const waits: number[] = []
    const runCommand = fakeCommands([
      { stdout: '', stderr: 'read: operation timed out', exitCode: 1 },
      { stdout: aComment, stderr: '', exitCode: 0 },
      { stdout: aReview, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 2,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.reviewSeen).toBe(true)
    expect(waits.length).toBeGreaterThan(0)
  })

  it('stops waiting when every fetch fails', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: 'read: operation timed out', exitCode: 1 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => Promise.resolve(),
      attempts: 1,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.reviewSeen).toBe(false)
  })

  it('stops waiting when the attempts run out', async () => {
    const runCommand = fakeCommands([
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: noReviews, stderr: '', exitCode: 0 },
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: noReviews, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => Promise.resolve(),
      attempts: 2,
    })({ pullRequestNumber: 549, commitSha: 'abc123' })

    expect(feedback.reviewSeen).toBe(false)
    expect(runCommand.requests).toHaveLength(4)
  })
})
