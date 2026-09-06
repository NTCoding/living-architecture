import { expect, it, vi } from 'vitest'
import { createWorkflowPullRequestFeedbackReader } from './workflow-pull-request-feedback-reader'

it('translates GitHub feedback into workflow feedback', () => {
  const readFeedback = createWorkflowPullRequestFeedbackReader(() => ({
    repository: 'example/repo',
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

  expect(readFeedback(42, { includeCodeRabbitStatus: true })).toStrictEqual({
    repository: 'example/repo',
    headRevision: 'a'.repeat(40),
    codeRabbitReview: {
      type: 'completed',
      statusId: 1,
      evidenceUrl: 'https://api.github.com/status/1',
    },
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
    repository: 'example/repo',
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

  expect(readFeedback(42, { includeCodeRabbitStatus: true })).toMatchObject({
    coderabbitRateLimited: true,
    coderabbitReviewSeen: false,
    coderabbitRateLimitEvidence: {
      repository: 'example/repo',
      prNumber: 42,
      headRevision: 'a'.repeat(40),
      statusId: 2,
      evidenceUrl: 'https://api.github.com/status/2',
    },
  })
})

it('forwards the workflow decision not to poll CodeRabbit without claiming completion', () => {
  const readGithub = vi.fn(() => ({
    repository: 'example/repo',
    headRevision: 'a'.repeat(40),
    codeRabbitStatus: { type: 'not-requested' as const },
    reviewDecision: null,
    threads: [],
    unresolvedCount: 0,
  }))
  const feedback = createWorkflowPullRequestFeedbackReader(readGithub)(42, {
    includeCodeRabbitStatus: false,
  })
  expect(readGithub).toHaveBeenCalledWith(42, { includeCodeRabbitStatus: false })
  expect(feedback).toMatchObject({ coderabbitReviewSeen: false, coderabbitRateLimited: false })
  expect(feedback.coderabbitRateLimitEvidence).toBeUndefined()
})

it.each([
  { type: 'unsupported', reason: 'Unrecognised completion signal' },
  { type: 'failed', statusId: 3, evidenceUrl: 'https://api.github.com/status/3' },
] as const)('preserves failed or unverifiable review evidence: %j', (codeRabbitStatus) => {
  const read = createWorkflowPullRequestFeedbackReader(() => ({
    repository: 'example/repo',
    headRevision: 'a'.repeat(40),
    codeRabbitStatus,
    reviewDecision: null,
    threads: [],
    unresolvedCount: 0,
  }))
  expect(read(42, { includeCodeRabbitStatus: true })).toMatchObject({
    repository: 'example/repo',
    headRevision: 'a'.repeat(40),
    codeRabbitReview: codeRabbitStatus,
    coderabbitReviewSeen: false,
  })
})
