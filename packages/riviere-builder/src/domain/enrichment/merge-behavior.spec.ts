import { mergeBehavior } from './merge-behavior'

describe('mergeBehavior', () => {
  it('creates new behavior when existing is undefined', () => {
    const result = mergeBehavior(undefined, { reads: ['a'] })
    expect(result).toStrictEqual({ reads: ['a'] })
  })

  it('appends to existing reads', () => {
    const result = mergeBehavior({ reads: ['a'] }, { reads: ['b'] })
    expect(result).toStrictEqual({ reads: ['a', 'b'] })
  })

  it('appends to existing validates', () => {
    const result = mergeBehavior({ validates: ['a'] }, { validates: ['b'] })
    expect(result).toStrictEqual({ validates: ['a', 'b'] })
  })

  it('appends to existing modifies', () => {
    const result = mergeBehavior({ modifies: ['a'] }, { modifies: ['b'] })
    expect(result).toStrictEqual({ modifies: ['a', 'b'] })
  })

  it('appends to existing emits', () => {
    const result = mergeBehavior({ emits: ['a'] }, { emits: ['b'] })
    expect(result).toStrictEqual({ emits: ['a', 'b'] })
  })

  it('preserves existing fields when adding new ones', () => {
    const result = mergeBehavior(
      {
        reads: ['a'],
        validates: ['v'],
      },
      { modifies: ['m'] },
    )
    expect(result).toStrictEqual({
      reads: ['a'],
      validates: ['v'],
      modifies: ['m'],
    })
  })
})
