import { describe, expect, it } from 'vitest'
import { parsePredicateForTest } from './parsed-predicate-fixture'

describe('parsePredicateForTest', () => {
  it('throws when a predicate input fails runtime validation', () => {
    expect(() => parsePredicateForTest({ nameMatches: { pattern: '[' } })).toThrow(
      'Pattern must be a valid regular expression',
    )
  })
})
