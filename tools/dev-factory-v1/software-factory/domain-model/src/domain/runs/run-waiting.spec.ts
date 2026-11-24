import { readRunWaiting } from './run-waiting'

describe('readRunWaiting', () => {
  it('returns null when the run has no steps', () => {
    expect(readRunWaiting(undefined)).toBeNull()
    expect(readRunWaiting({})).toBeNull()
  })

  it('returns null when no step is suspended', () => {
    expect(readRunWaiting({ 'open-pull-request': { status: 'success' } })).toBeNull()
  })

  it('reads the question the planner asks before implementation', () => {
    const waiting = readRunWaiting({
      'wait-for-plan-clarification': [
        { status: 'suspended', suspendPayload: { question: 'Bytes or lines?' } },
      ],
    })

    expect(waiting).toStrictEqual({ kind: 'plan-question', question: 'Bytes or lines?' })
  })

  it('reports a plan clarification even when the planner did not write its question', () => {
    expect(
      readRunWaiting({
        'wait-for-plan-clarification': [
          { status: 'suspended', suspendPayload: { question: null } },
        ],
      }),
    ).toStrictEqual({ kind: 'plan-question', question: null })
    expect(
      readRunWaiting({
        'wait-for-plan-clarification': [{ status: 'suspended', suspendPayload: { question: '' } }],
      }),
    ).toStrictEqual({ kind: 'plan-question', question: '' })
  })

  it('reads the question the implementer asks', () => {
    const waiting = readRunWaiting({
      implement: [{ status: 'suspended', suspendPayload: { question: 'Which database?' } }],
    })

    expect(waiting).toStrictEqual({ kind: 'implementer-question', question: 'Which database?' })
  })

  it('reads the findings the implementer could not address', () => {
    const waiting = readRunWaiting({
      'address-feedback': [
        {
          status: 'suspended',
          suspendPayload: { reason: 'The findings conflict.', unaddressed: [4, 7] },
        },
      ],
    })

    expect(waiting).toStrictEqual({
      kind: 'feedback-question',
      reason: 'The findings conflict.',
      unaddressed: [4, 7],
    })
  })

  it('leaves out the unaddressed findings that are not numbers', () => {
    const waiting = readRunWaiting({
      'address-feedback': [
        { status: 'suspended', suspendPayload: { reason: 'Leave them.', unaddressed: [1, 'x'] } },
      ],
    })

    expect(waiting).toStrictEqual({
      kind: 'feedback-question',
      reason: 'Leave them.',
      unaddressed: [1],
    })
  })

  it('reads no unaddressed findings when the payload has none', () => {
    const waiting = readRunWaiting({
      'address-feedback': [{ status: 'suspended', suspendPayload: { reason: 'Stuck.' } }],
    })

    expect(waiting).toStrictEqual({
      kind: 'feedback-question',
      reason: 'Stuck.',
      unaddressed: [],
    })
  })

  it('returns null when a suspended step is not one that waits for a person', () => {
    const waiting = readRunWaiting({
      'push-branch': [{ status: 'suspended', suspendPayload: { question: 'Which remote?' } }],
    })

    expect(waiting).toBeNull()
  })

  it('returns null when the implementer question is empty', () => {
    expect(
      readRunWaiting({ implement: [{ status: 'suspended', suspendPayload: { question: '' } }] }),
    ).toBeNull()
  })

  it('returns null when the feedback payload has no reason', () => {
    expect(
      readRunWaiting({
        'address-feedback': [{ status: 'suspended', suspendPayload: { unaddressed: [1] } }],
      }),
    ).toBeNull()
  })

  it('returns null when a suspended step carries no payload', () => {
    expect(readRunWaiting({ implement: [{ status: 'suspended' }] })).toBeNull()
    expect(readRunWaiting({ 'wait-for-plan-clarification': [{ status: 'suspended' }] })).toBeNull()
    expect(readRunWaiting({ 'address-feedback': [{ status: 'suspended' }] })).toBeNull()
  })

  it('returns null when a step carries no status', () => {
    expect(readRunWaiting({ implement: [{ suspendPayload: { question: 'Why?' } }] })).toBeNull()
  })
})
