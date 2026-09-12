import { getKnownWorkflowEventTypes, parseWorkflowEvent } from './workflow-events'
import { Reviewer, Reviewers } from './reviews/reviewers'
import { ReviewStatuses } from './reviews/statuses'

const AT = '2026-01-01T00:00:00Z'

describe('workflow events', () => {
  it('lists the events used by the GitHub review workflow', () => {
    expect(getKnownWorkflowEventTypes()).toStrictEqual([
      'session-started',
      'transitioned',
      'issue-recorded',
      'branch-recorded',
      'pr-recorded',
      'review-cycle-started',
      'review-cycle-closed',
      'reviewer-status-recorded',
      'bash-checked',
      'write-checked',
    ])
  })

  it('parses a started review cycle with its included and excluded reviewers', () => {
    expect(
      parseWorkflowEvent({
        type: 'review-cycle-started',
        at: AT,
        cycleNumber: 2,
        includedReviewers: ['code-review', 'architecture-review'],
        excludedReviewers: { 'task-check': 'already-approved' },
      }),
    ).toMatchObject({
      cycleNumber: 2,
      includedReviewers: ['code-review', 'architecture-review'],
      excludedReviewers: { 'task-check': 'already-approved' },
    })
  })

  it('parses a closed review cycle with its outcomes', () => {
    expect(
      parseWorkflowEvent({
        type: 'review-cycle-closed',
        at: AT,
        cycleNumber: 2,
        outcomes: { 'code-review': 'APPROVED', coderabbit: 'APPROVED' },
      }),
    ).toMatchObject({
      cycleNumber: 2,
      outcomes: { 'code-review': 'APPROVED', coderabbit: 'APPROVED' },
    })
  })

  it('rejects a review cycle event whose cycle number is not a positive integer', () => {
    for (const cycleNumber of [0, -1, 1.5]) {
      expect(() =>
        parseWorkflowEvent({
          type: 'review-cycle-started',
          at: AT,
          cycleNumber,
          includedReviewers: ['code-review'],
          excludedReviewers: {},
        }),
      ).toThrow(/Number must be greater than 0|Expected integer/)
    }
  })

  it('rejects a closed review cycle with an unknown reviewer outcome', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'review-cycle-closed',
        at: AT,
        cycleNumber: 1,
        outcomes: { 'code-review': 'UNKNOWN' },
      }),
    ).toThrow('Unknown reviewer status: UNKNOWN')
  })

  it('rejects a closed review cycle with an unknown reviewer', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'review-cycle-closed',
        at: AT,
        cycleNumber: 1,
        outcomes: { 'unknown-reviewer': 'APPROVED' },
      }),
    ).toThrow('Unknown reviewer: unknown-reviewer')
  })

  it('parses a reviewer status record', () => {
    expect(
      parseWorkflowEvent({
        type: 'reviewer-status-recorded',
        at: AT,
        reviewer: 'architecture-review',
        status: 'OPEN_FEEDBACK',
      }),
    ).toMatchObject({ reviewer: 'architecture-review', status: 'OPEN_FEEDBACK' })
  })

  it('rejects a reviewer status record with an unknown reviewer', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'reviewer-status-recorded',
        at: AT,
        reviewer: 'unknown',
        status: 'APPROVED',
      }),
    ).toThrow('Unknown reviewer')
  })

  it('rejects a reviewer status record with an unknown status', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'reviewer-status-recorded',
        at: AT,
        reviewer: 'architecture-review',
        status: 'DONE',
      }),
    ).toThrow('Unknown reviewer status')
  })

  it('parses the review domain value objects', () => {
    expect(Reviewer.fromName('code-review').name()).toBe('code-review')
    expect(Reviewers.parse(['code-review']).values).toStrictEqual(['code-review'])
    expect(ReviewStatuses.parse(['APPROVED']).values).toStrictEqual(['APPROVED'])
  })

  it('rejects an unknown reviewer name', () => {
    expect(() => Reviewer.fromName('unknown')).toThrow('Unknown reviewer: unknown')
  })

  it.each([
    ['branch-recorded', { branch: undefined }],
    ['pr-recorded', { prNumber: undefined }],
    ['bash-checked', { tool: undefined, command: 'git status', allowed: true }],
    ['write-checked', { tool: 'write', filePath: undefined, allowed: true }],
  ] as const)('rejects malformed %s events', (type, payload) => {
    expect(() => parseWorkflowEvent({ type, at: AT, ...payload })).toThrow('Required')
  })

  it.each([
    { type: 'session-started' },
    { type: 'transitioned', from: 'IMPLEMENTING', to: 'REVIEWING' },
    { type: 'issue-recorded', issueNumber: 42 },
    { type: 'branch-recorded', branch: 'issue-42' },
    { type: 'pr-recorded', prNumber: 1, prUrl: 'https://example.test/pr/1' },
    { type: 'reviewer-status-recorded', reviewer: 'code-review', status: 'APPROVED' },
    { type: 'bash-checked', tool: 'bash', command: 'git status', allowed: true, reason: 'ok' },
    { type: 'write-checked', tool: 'write', filePath: 'a.ts', allowed: false, reason: 'no' },
  ] as const)('parses a %s event', (event) => {
    expect(parseWorkflowEvent({ at: AT, ...event })).toMatchObject({ type: event.type })
  })

  it('rejects an unknown event type', () => {
    expect(() => parseWorkflowEvent({ type: 'unknown', at: AT })).toThrow('unknown type')
  })
})
