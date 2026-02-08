import { deduplicateStrings } from './deduplicate-strings'

describe('deduplicateStrings', () => {
  it('returns all incoming when no existing', () => {
    const result = deduplicateStrings([], ['a', 'b'])
    expect(result).toStrictEqual(['a', 'b'])
  })

  it('filters out duplicates', () => {
    const result = deduplicateStrings(['a', 'b'], ['b', 'c'])
    expect(result).toStrictEqual(['c'])
  })

  it('returns empty when all duplicates', () => {
    const result = deduplicateStrings(['a', 'b'], ['a', 'b'])
    expect(result).toStrictEqual([])
  })
})
