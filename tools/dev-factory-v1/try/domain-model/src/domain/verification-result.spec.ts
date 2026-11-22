import { describe, expect, it } from 'vitest'
import { VerificationCheck, VerificationResult } from './verification-result'

describe('VerificationResult', () => {
  it('is green when every check passed', () => {
    const result = VerificationResult.from([
      VerificationCheck.from({ name: 'lint', passed: true }),
      VerificationCheck.from({ name: 'test', passed: true }),
    ])

    expect(result.isGreen()).toBe(true)
    expect(result.failures()).toStrictEqual([])
  })

  it('names the checks that failed', () => {
    const result = VerificationResult.from([
      VerificationCheck.from({ name: 'lint', passed: true }),
      VerificationCheck.from({ name: 'role-check', passed: false }),
    ])

    expect(result.isGreen()).toBe(false)
    expect(result.failures().map((check) => check.name())).toStrictEqual(['role-check'])
    expect(result.failures()[0]?.passed()).toBe(false)
  })

  it('rejects a check without a name', () => {
    expect(() => VerificationCheck.from({ name: ' ', passed: true })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
