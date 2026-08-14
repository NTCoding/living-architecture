import { expect, it } from 'vitest'
import { createWorkflowPullRequestFeedbackReader } from './workflow-pull-request-feedback-reader'

it('translates GitHub feedback into workflow feedback', () => {
  const readFeedback = createWorkflowPullRequestFeedbackReader(() => ({
    coderabbitReviewSeen: true,
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
