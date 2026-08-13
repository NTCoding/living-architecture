import { parseWorkflowEvent } from './workflow-events'

const AT = '2026-01-01T00:00:00Z'

describe('parseWorkflowEvent — pr-feedback-verification-failed', () => {
  it('accepts failure reason payload', () => {
    const result = parseWorkflowEvent({
      type: 'pr-feedback-verification-failed',
      at: AT,
      reason: 'CodeRabbit feedback did not appear.',
    })

    expect(result).toStrictEqual({
      type: 'pr-feedback-verification-failed',
      at: AT,
      reason: 'CodeRabbit feedback did not appear.',
    })
  })

  it('rejects missing reason', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'pr-feedback-verification-failed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})
