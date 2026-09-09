import { getKnownWorkflowEventTypes, parseWorkflowEvent } from './workflow-events'
import { Reviewers } from './reviews/reviewers'
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
      'reviewer-status-recorded',
      'bash-checked',
      'write-checked',
    ])
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
    ).toThrow('Invalid enum value')
  })

  it('rejects a reviewer status record with an unknown status', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'reviewer-status-recorded',
        at: AT,
        reviewer: 'architecture-review',
        status: 'DONE',
      }),
    ).toThrow('Invalid enum value')
  })

  it('parses the review domain value objects', () => {
    expect(Reviewers.parse(['code-review']).values).toStrictEqual(['code-review'])
    expect(ReviewStatuses.parse(['APPROVED']).values).toStrictEqual(['APPROVED'])
  })

  it.each([
    ['branch-recorded', { branch: undefined }],
    ['pr-recorded', { prNumber: undefined }],
    ['bash-checked', { tool: undefined, command: 'git status', allowed: true }],
    ['write-checked', { tool: 'write', filePath: undefined, allowed: true }],
  ] as const)('rejects malformed %s events', (type, payload) => {
    expect(() => parseWorkflowEvent({ type, at: AT, ...payload })).toThrow('Required')
  })
})
