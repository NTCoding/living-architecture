import {
  describe, it, expect 
} from 'vitest'
import { deduplicateCrossStrategy } from './detect-connections'
import { ExtractedLink } from './extracted-link'

function createLink(overrides: Partial<ExtractedLink> = {}): ExtractedLink {
  return new ExtractedLink({
    source: 'orders:orders-module:useCase:orderservice',
    target: overrides.target ?? 'orders:orders-module:event:eventbus',
    type: overrides.type ?? 'sync',
    ...(overrides._uncertain !== undefined && { _uncertain: overrides._uncertain }),
    ...(overrides.sourceLocation !== undefined && { sourceLocation: overrides.sourceLocation }),
  })
}

describe('deduplicateCrossStrategy', () => {
  it('replaces uncertain link with certain link for same key', () => {
    const uncertain = createLink({ _uncertain: 'extract rule failed' })
    const certain = createLink()

    const result = deduplicateCrossStrategy([uncertain, certain])

    expect(result).toHaveLength(1)
    expect(result[0]?._uncertain).toBeUndefined()
  })

  it('keeps certain link when uncertain link arrives second', () => {
    const certain = createLink()
    const uncertain = createLink({ _uncertain: 'extract rule failed' })

    const result = deduplicateCrossStrategy([certain, uncertain])

    expect(result).toHaveLength(1)
    expect(result[0]?._uncertain).toBeUndefined()
  })

  it('keeps first uncertain link when no certain alternative exists', () => {
    const uncertain1 = createLink({ _uncertain: 'reason one' })
    const uncertain2 = createLink({ _uncertain: 'reason two' })

    const result = deduplicateCrossStrategy([uncertain1, uncertain2])

    expect(result).toHaveLength(1)
    expect(result[0]?._uncertain).toBe('reason one')
  })

  it('deduplicates links with different keys independently', () => {
    const linkA = createLink({ target: 'orders:orders-module:event:eventbusa' })
    const linkB = createLink({ target: 'orders:orders-module:event:eventbusb' })

    const result = deduplicateCrossStrategy([linkA, linkB])

    expect(result).toHaveLength(2)
  })
})
