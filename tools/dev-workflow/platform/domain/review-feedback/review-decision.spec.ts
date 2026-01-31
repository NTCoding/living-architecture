import {
  describe, it, expect 
} from 'vitest'
import { reviewDecisionSchema } from './review-decision'

describe('ReviewDecision', () => {
  it('parses valid review decision', () => {
    const decision = reviewDecisionSchema.parse({
      reviewer: 'coderabbitai',
      state: 'APPROVED',
    })
    expect(decision.reviewer).toBe('coderabbitai')
    expect(decision.state).toBe('APPROVED')
  })

  it('rejects missing reviewer', () => {
    expect(() => reviewDecisionSchema.parse({ state: 'APPROVED' })).toThrow('Invalid input')
  })

  it('rejects missing state', () => {
    expect(() => reviewDecisionSchema.parse({ reviewer: 'test' })).toThrow('Invalid option')
  })

  it('rejects invalid state value', () => {
    expect(() =>
      reviewDecisionSchema.parse({
        reviewer: 'test',
        state: 'INVALID_STATE',
      }),
    ).toThrow('Invalid option')
  })

  it('rejects empty reviewer', () => {
    expect(() =>
      reviewDecisionSchema.parse({
        reviewer: '',
        state: 'APPROVED',
      }),
    ).toThrow('Too small')
  })
})
