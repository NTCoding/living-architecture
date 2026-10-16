import { describe, expect, it } from 'vitest'
import { MissingTestFixtureError, mustBeDefined } from './missing-test-fixture-error'

describe('mustBeDefined', () => {
  it('returns the value when defined', () => {
    expect(mustBeDefined(5, 'number')).toBe(5)
  })

  it('throws MissingTestFixtureError when undefined', () => {
    expect(() => mustBeDefined(undefined, 'number')).toThrow(MissingTestFixtureError)
  })
})
