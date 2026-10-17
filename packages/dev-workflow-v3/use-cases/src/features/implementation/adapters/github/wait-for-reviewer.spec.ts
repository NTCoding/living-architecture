import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { waitForReviewerWithGithub } from './wait-for-reviewer'

const aComment = JSON.stringify([
  { path: 'src/order.ts', line: 12, body: 'A rule.', user: { login: 'coderabbitai' } },
])

const noComments = '[]'

describe('waitForReviewerWithGithub', () => {
  it('returns as soon as the reviewer has commented', async () => {
    const waits: number[] = []
    const runCommand = fakeCommands([{ stdout: aComment, stderr: '', exitCode: 0 }])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 3,
    })({ pullRequestNumber: 549 })

    expect(feedback.reviewSeen).toBe(true)
    expect(waits).toStrictEqual([])
  })

  it('waits and then returns the review', async () => {
    const waits: number[] = []
    const runCommand = fakeCommands([
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: aComment, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => {
        waits.push(1)
      },
      attempts: 3,
    })({ pullRequestNumber: 549 })

    expect(feedback.reviewSeen).toBe(true)
    expect(waits).toHaveLength(1)
  })

  it('stops waiting when the attempts run out', async () => {
    const runCommand = fakeCommands([
      { stdout: noComments, stderr: '', exitCode: 0 },
      { stdout: noComments, stderr: '', exitCode: 0 },
    ])

    const feedback = await waitForReviewerWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => Promise.resolve(),
      attempts: 2,
    })({ pullRequestNumber: 549 })

    expect(feedback.reviewSeen).toBe(false)
    expect(runCommand.requests).toHaveLength(2)
  })
})
