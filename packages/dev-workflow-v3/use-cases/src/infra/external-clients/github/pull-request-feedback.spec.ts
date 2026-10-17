import { describe, expect, it } from 'vitest'
import { readGithubPullRequestFeedback } from './pull-request-feedback'
import { fakeCommands } from '../process/__fixtures__/command-test-fixtures'

const coderabbitComment = {
  path: 'src/order.ts',
  line: 12,
  body: 'Consider a value object.',
  user: { login: 'coderabbitai' },
}

describe('readGithubPullRequestFeedback', () => {
  it('reads the reviewer comments that have a line', async () => {
    const runCommand = fakeCommands([
      {
        stdout: JSON.stringify([coderabbitComment, { ...coderabbitComment, line: null }]),
        stderr: '',
        exitCode: 0,
      },
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(true)
    expect(feedback.rateLimited).toBe(false)
    expect(feedback.comments).toStrictEqual([
      { path: 'src/order.ts', line: 12, body: 'Consider a value object.' },
    ])
  })

  it('ignores comments from other people', async () => {
    const runCommand = fakeCommands([
      {
        stdout: JSON.stringify([{ ...coderabbitComment, user: { login: 'someone-else' } }]),
        stderr: '',
        exitCode: 0,
      },
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(false)
    expect(feedback.comments).toStrictEqual([])
  })

  it('reports a rate limited review', async () => {
    const runCommand = fakeCommands([
      {
        stdout: JSON.stringify([{ ...coderabbitComment, body: 'You have hit the rate limit.' }]),
        stderr: '',
        exitCode: 0,
      },
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.rateLimited).toBe(true)
  })

  it('treats a comment with no author as someone else', async () => {
    const runCommand = fakeCommands([
      { stdout: JSON.stringify([{ ...coderabbitComment, user: null }]), stderr: '', exitCode: 0 },
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(false)
  })
})
