import { describe, expect, it } from 'vitest'
import { parseAiMemory } from './ai-extract-memory'

describe('parseAiMemory', () => {
  it('returns undefined prose and no suppressions when memory is undefined', () => {
    const result = parseAiMemory(undefined)

    expect(result).toStrictEqual({ prose: undefined, suppressedComponentIds: [] })
  })

  it('returns the content as prose when no suppression directives are present', () => {
    const result = parseAiMemory('Some learnings about the system\nAnother note')

    expect(result).toStrictEqual({
      prose: 'Some learnings about the system\nAnother note',
      suppressedComponentIds: [],
    })
  })

  it('extracts suppressed component ids from suppress directives', () => {
    const result = parseAiMemory(
      'General notes\nsuppress: orders:ordering:Event:order-placed\nsuppress: orders:ordering:UseCase:place-order',
    )

    expect(result).toStrictEqual({
      prose:
        'General notes\nsuppress: orders:ordering:Event:order-placed\nsuppress: orders:ordering:UseCase:place-order',
      suppressedComponentIds: [
        'orders:ordering:Event:order-placed',
        'orders:ordering:UseCase:place-order',
      ],
    })
  })

  it('ignores blank suppression directives', () => {
    const result = parseAiMemory('suppress: \nsuppress: orders:ordering:Event:order-placed')

    expect(result.suppressedComponentIds).toStrictEqual(['orders:ordering:Event:order-placed'])
  })

  it('handles Windows line endings', () => {
    const result = parseAiMemory('notes\r\nsuppress: orders:ordering:Event:order-placed')

    expect(result.suppressedComponentIds).toStrictEqual(['orders:ordering:Event:order-placed'])
  })
})
