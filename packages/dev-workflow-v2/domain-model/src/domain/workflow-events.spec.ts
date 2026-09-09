import { getKnownWorkflowEventTypes, parseWorkflowEvent } from './workflow-events'

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
})
