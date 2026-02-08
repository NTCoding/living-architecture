import { deduplicateStateTransitions } from './deduplicate-transitions'

describe('deduplicateStateTransitions', () => {
  it('returns all incoming when no existing', () => {
    const result = deduplicateStateTransitions(
      [],
      [
        {
          from: 'a',
          to: 'b',
        },
      ],
    )
    expect(result).toStrictEqual([
      {
        from: 'a',
        to: 'b',
      },
    ])
  })

  it('filters out duplicates by from and to', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b',
        },
      ],
      [
        {
          from: 'a',
          to: 'b',
        },
        {
          from: 'b',
          to: 'c',
        },
      ],
    )
    expect(result).toStrictEqual([
      {
        from: 'b',
        to: 'c',
      },
    ])
  })

  it('treats different triggers as non-duplicates', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b',
        },
      ],
      [
        {
          from: 'a',
          to: 'b',
          trigger: 'submit',
        },
      ],
    )
    expect(result).toStrictEqual([
      {
        from: 'a',
        to: 'b',
        trigger: 'submit',
      },
    ])
  })

  it('treats missing trigger on incoming as non-duplicate of triggered existing', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b',
          trigger: 'submit',
        },
      ],
      [
        {
          from: 'a',
          to: 'b',
        },
      ],
    )
    expect(result).toStrictEqual([
      {
        from: 'a',
        to: 'b',
      },
    ])
  })

  it('filters duplicates including trigger', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b',
          trigger: 'submit',
        },
      ],
      [
        {
          from: 'a',
          to: 'b',
          trigger: 'submit',
        },
      ],
    )
    expect(result).toStrictEqual([])
  })

  it('returns empty when all duplicates', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b',
        },
        {
          from: 'b',
          to: 'c',
        },
      ],
      [
        {
          from: 'a',
          to: 'b',
        },
        {
          from: 'b',
          to: 'c',
        },
      ],
    )
    expect(result).toStrictEqual([])
  })
})
