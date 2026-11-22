import { describe, expect, it } from 'vitest'
import { readGithubPullRequestFeedback } from './pull-request-feedback'
import { fakeCommands } from '../process/__fixtures__/command-test-fixtures'

const coderabbitComment = {
  id: 4306,
  path: 'src/order.ts',
  line: 12,
  body: 'Consider a value object.',
  user: { login: 'coderabbitai' },
}

const reviewsEndpoint = (reviews: readonly unknown[]) => ({
  stdout: JSON.stringify(reviews),
  stderr: '',
  exitCode: 0,
})

const commentsEndpoint = (comments: readonly unknown[]) => ({
  stdout: JSON.stringify(comments),
  stderr: '',
  exitCode: 0,
})

describe('readGithubPullRequestFeedback', () => {
  it('reads the reviewer comments that have a line', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([coderabbitComment, { ...coderabbitComment, line: null }]),
      reviewsEndpoint([]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(true)
    expect(feedback.rateLimited).toBe(false)
    expect(feedback.comments).toStrictEqual([
      { commentId: 4306, path: 'src/order.ts', line: 12, body: 'Consider a value object.' },
    ])
  })

  it('sees a review by the bot login even without inline comments', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([]),
      reviewsEndpoint([
        {
          state: 'CHANGES_REQUESTED',
          body: 'Move AI client construction to the shell before merging.',
          user: { login: 'coderabbitai[bot]' },
        },
      ]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(true)
    expect(feedback.verdict).toBe('changes-requested')
    expect(feedback.summary).toBe('Move AI client construction to the shell before merging.')
    expect(feedback.comments).toStrictEqual([])
  })

  it('reports an approval verdict from the latest review', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([]),
      reviewsEndpoint([
        {
          state: 'CHANGES_REQUESTED',
          body: 'Fix this.',
          user: { login: 'coderabbitai' },
        },
        { state: 'APPROVED', body: 'Looks good.', user: { login: 'coderabbitai[bot]' } },
      ]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.verdict).toBe('approved')
  })

  it('reports a commented verdict from the latest review', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([]),
      reviewsEndpoint([
        { state: 'COMMENTED', body: 'Some thoughts.', user: { login: 'coderabbitai' } },
      ]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.verdict).toBe('commented')
    expect(feedback.reviewSeen).toBe(true)
  })

  it('reports no verdict for a dismissed review', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([]),
      reviewsEndpoint([{ state: 'DISMISSED', body: null, user: { login: 'coderabbitai' } }]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.verdict).toBeNull()
  })

  it('reports no verdict when coderabbit has not reviewed', async () => {
    const runCommand = fakeCommands([commentsEndpoint([]), reviewsEndpoint([])])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(false)
    expect(feedback.verdict).toBeNull()
  })

  it('ignores reviews from other people', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([]),
      reviewsEndpoint([{ state: 'APPROVED', body: 'Fine.', user: { login: 'someone-else' } }]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.verdict).toBeNull()
    expect(feedback.reviewSeen).toBe(false)
  })

  it('ignores comments from other people', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([{ ...coderabbitComment, user: { login: 'someone-else' } }]),
      reviewsEndpoint([]),
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
      commentsEndpoint([{ ...coderabbitComment, body: 'You have hit the rate limit.' }]),
      reviewsEndpoint([]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.rateLimited).toBe(true)
  })

  it('treats a comment with no author as someone else', async () => {
    const runCommand = fakeCommands([
      commentsEndpoint([{ ...coderabbitComment, user: null }]),
      reviewsEndpoint([]),
    ])

    const feedback = await readGithubPullRequestFeedback(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
    })

    expect(feedback.reviewSeen).toBe(false)
  })
})
