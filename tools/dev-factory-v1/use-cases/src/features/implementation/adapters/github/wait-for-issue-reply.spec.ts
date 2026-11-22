import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { waitForIssueReplyWithGithub } from './wait-for-issue-reply'

const comments = (createdAt: string, body: string) =>
  JSON.stringify({ comments: [{ createdAt, body }] })

describe('waitForIssueReplyWithGithub', () => {
  it('returns the first comment that came after the plan', async () => {
    const runCommand = fakeCommands([
      { stdout: comments('2026-10-18T09:59:00Z', 'before the plan'), stderr: '', exitCode: 0 },
      { stdout: comments('2026-10-18T10:05:00Z', 'bytes, 64 KiB'), stderr: '', exitCode: 0 },
    ])

    const reply = await waitForIssueReplyWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => undefined,
      attempts: 3,
    })({ issueNumber: 500, after: '2026-10-18T10:00:00Z' })

    expect(reply).toStrictEqual({ reply: 'bytes, 64 KiB' })
    expect(runCommand.requests).toHaveLength(2)
  })

  it('gives up when no comment arrives before the last attempt', async () => {
    const runCommand = fakeCommands([
      { stdout: comments('2026-10-18T09:59:00Z', 'before the plan'), stderr: '', exitCode: 0 },
    ])

    const reply = await waitForIssueReplyWithGithub({
      runCommand,
      workingDirectory: '/repo',
      wait: async () => undefined,
      attempts: 1,
    })({ issueNumber: 500, after: '2026-10-18T10:00:00Z' })

    expect(reply).toStrictEqual({ reply: null })
  })
})
