import { expect, it } from 'vitest'
import { createWorkflowPullRequestFeedbackReader } from './workflow-pull-request-feedback-reader'

it('translates GitHub feedback into workflow feedback', () => {
  const readFeedback = createWorkflowPullRequestFeedbackReader(() => ({
    headRevision: 'a'.repeat(40),
    codeRabbitStatus: {
      type: 'completed',
      statusId: 1,
      evidenceUrl: 'https://api.github.com/status/1',
    },
    reviewDecision: 'CHANGES_REQUESTED',
    threads: [
      {
        comments: [
          {
            author: { login: 'reviewer' },
            body: 'Please change this.',
            url: 'https://github.com/example/repo/pull/42#discussion_r1',
          },
          {
            author: null,
            body: 'Follow-up without a URL.',
          },
        ],
        id: 'thread-1',
        isOutdated: false,
        isResolved: false,
        line: 12,
        path: 'src/example.ts',
      },
    ],
    unresolvedCount: 1,
  }))

  expect(readFeedback(42)).toStrictEqual({
    coderabbitReviewSeen: true,
    coderabbitRateLimited: false,
    reviewDecision: 'CHANGES_REQUESTED',
    threads: [
      {
        comments: [
          {
            author: { login: 'reviewer' },
            body: 'Please change this.',
            url: 'https://github.com/example/repo/pull/42#discussion_r1',
          },
          {
            author: null,
            body: 'Follow-up without a URL.',
          },
        ],
        id: 'thread-1',
        isOutdated: false,
        isResolved: false,
        line: 12,
        path: 'src/example.ts',
      },
    ],
    unresolvedCount: 1,
  })
})

it('preserves CodeRabbit rate limiting', () => {
  const readFeedback = createWorkflowPullRequestFeedbackReader(() => ({
    headRevision: 'a'.repeat(40),
    codeRabbitStatus: {
      type: 'rate-limited',
      statusId: 2,
      evidenceUrl: 'https://api.github.com/status/2',
    },
    reviewDecision: null,
    threads: [],
    unresolvedCount: 0,
  }))

  expect(readFeedback(42).coderabbitRateLimited).toBe(true)
})
