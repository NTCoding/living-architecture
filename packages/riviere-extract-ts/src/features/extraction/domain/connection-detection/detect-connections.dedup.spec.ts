import {
  describe, it, expect 
} from 'vitest'
import { deduplicateCrossStrategy } from './detect-connections'
import type { ExtractedLink } from './extracted-link'

function createLink(overrides: Partial<ExtractedLink> = {}): ExtractedLink {
  return {
    source: 'orders:useCase:OrderService',
    target: 'orders:event:EventBus',
    type: 'sync',
    ...overrides,
  }
}

describe('deduplicateCrossStrategy', () => {
  it('replaces uncertain link with certain link for same key', () => {
    const uncertain = createLink({ _uncertain: 'extract rule failed' })
    const certain = createLink()

    const result = deduplicateCrossStrategy([uncertain, certain])

    expect(result).toHaveLength(1)
    expect(result[0]).not.toHaveProperty('_uncertain')
  })

  it('keeps certain link when uncertain link arrives second', () => {
    const certain = createLink()
    const uncertain = createLink({ _uncertain: 'extract rule failed' })

    const result = deduplicateCrossStrategy([certain, uncertain])

    expect(result).toHaveLength(1)
    expect(result[0]).not.toHaveProperty('_uncertain')
  })

  it('keeps first uncertain link when no certain alternative exists', () => {
    const uncertain1 = createLink({ _uncertain: 'reason one' })
    const uncertain2 = createLink({ _uncertain: 'reason two' })

    const result = deduplicateCrossStrategy([uncertain1, uncertain2])

    expect(result).toHaveLength(1)
    expect(result[0]?._uncertain).toBe('reason one')
  })

  it('deduplicates links with different keys independently', () => {
    const linkA = createLink({ target: 'orders:event:EventBusA' })
    const linkB = createLink({ target: 'orders:event:EventBusB' })

    const result = deduplicateCrossStrategy([linkA, linkB])

    expect(result).toHaveLength(2)
  })
})
