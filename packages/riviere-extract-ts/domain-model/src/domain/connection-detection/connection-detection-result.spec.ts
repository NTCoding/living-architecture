import { describe, expect, it } from 'vitest'
import { ConnectionDetectionResult } from './connection-detection-result'
import { ExtractedLink } from './extracted-link'

describe('ConnectionDetectionResult', () => {
  it('keeps one certain connection for each source, target, and type', () => {
    const uncertain = ExtractedLink.parse({
      source: 'orders:useCase:PlaceOrder',
      target: 'orders:repository:Orders',
      type: 'sync',
      _uncertain: 'Interface has several implementations',
    })
    const certain = ExtractedLink.parse({
      source: 'orders:useCase:PlaceOrder',
      target: 'orders:repository:Orders',
      type: 'sync',
    })
    const laterUncertain = ExtractedLink.parse({
      source: 'orders:useCase:PlaceOrder',
      target: 'orders:repository:Orders',
      type: 'sync',
      _uncertain: 'Later uncertain evidence',
    })

    const result = ConnectionDetectionResult.parse({
      links: [uncertain, certain, laterUncertain],
      externalLinks: [],
    })

    expect(result.links).toStrictEqual([certain])
  })

  it('retains external links', () => {
    const externalLinks = [
      {
        source: 'orders:api:OrdersApi',
        target: { name: 'payments' },
        type: 'sync' as const,
      },
    ]

    expect(ConnectionDetectionResult.parse({ links: [], externalLinks }).externalLinks).toBe(
      externalLinks,
    )
  })
})
