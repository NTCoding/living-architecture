import { describe, expect, it } from 'vitest'
import { ImplementationOutcome } from './implementation-outcome'

describe('ImplementationOutcome', () => {
  it('records completed work', () => {
    const outcome = ImplementationOutcome.from({
      summary: 'Added the value objects.',
      blockedReason: null,
    })

    expect(outcome.summary()).toBe('Added the value objects.')
    expect(outcome.isBlocked()).toBe(false)
    expect(outcome.reason()).toBeNull()
  })

  it('records a blocked implementer with the reason', () => {
    const outcome = ImplementationOutcome.from({
      summary: 'Stopped before the ports.',
      blockedReason: 'Two ports already exist under different names.',
    })

    expect(outcome.isBlocked()).toBe(true)
    expect(outcome.reason()).toBe('Two ports already exist under different names.')
  })

  it('rejects an empty summary or an empty blocked reason', () => {
    expect(() => ImplementationOutcome.from({ summary: ' ', blockedReason: null })).toThrow(
      'String must contain at least 1 character(s)',
    )
    expect(() => ImplementationOutcome.from({ summary: 'Stopped.', blockedReason: ' ' })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
