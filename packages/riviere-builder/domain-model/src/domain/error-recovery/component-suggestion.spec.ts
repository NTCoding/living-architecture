import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import { describe, expect, it } from 'vitest'
import { findNearMatches } from './component-suggestion'

function componentNamed(name: string): Component {
  return {
    id: `orders:core:use-case:${name.toLowerCase()}`,
    name,
    domain: 'orders',
    module: 'core',
    type: 'UseCase',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/order.ts',
    },
  }
}

describe('findNearMatches name similarity', () => {
  it.each([
    ['OrderService', 'OrderService', 1.0],
    ['OrderService', 'orderservice', 1.0],
    ['ORDER', 'order', 1.0],
    ['OrderService', 'OrdrService', 0.917],
    ['OrderService', 'OrderServic', 0.917],
    ['PaymentProcessor', 'PaymentProcesor', 0.938],
    ['OrderService', 'OrderHandler', 0.417],
    ['OrderService', 'UserProfile', 0.333],
    ['abc', 'xyz', 0.0],
    ['abc', '', 0.0],
  ] as const)(
    'measures the similarity of "%s" and "%s" as approximately %d',
    (expected, actual, similarity) => {
      const matches = findNearMatches(
        [componentNamed(actual)],
        { name: expected },
        { threshold: 0 },
      )

      expect(matches).toHaveLength(1)
      expect(matches[0]?.score).toBeCloseTo(similarity, 2)
    },
  )

  it('returns no suggestions for an empty expected name', () => {
    expect(
      findNearMatches([componentNamed('OrderService')], { name: '' }, { threshold: 0 }),
    ).toStrictEqual([])
  })
})
