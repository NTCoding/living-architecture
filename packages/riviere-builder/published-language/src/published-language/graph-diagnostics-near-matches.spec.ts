import { describe, it, expect } from 'vitest'
import { GraphDiagnostics } from './graph-diagnostics'
import { RiviereBuilder } from './riviere-builder'

class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

function createGraphDiagnostics(): GraphDiagnostics {
  const builder = RiviereBuilder.new({
    sources: [
      {
        repository: 'test/repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
      shipping: {
        description: 'Shipping domain',
        systemType: 'domain',
      },
    },
  })

  builder.addUseCase({
    name: 'OrderService',
    domain: 'orders',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/order.ts',
      lineNumber: 1,
    },
  })

  builder.addUseCase({
    name: 'PaymentService',
    domain: 'orders',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/payment.ts',
      lineNumber: 1,
    },
  })

  builder.addEvent({
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'events',
    eventName: 'OrderPlaced',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/events.ts',
      lineNumber: 1,
    },
  })

  builder.addUseCase({
    name: 'ShippingService',
    domain: 'shipping',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/shipping.ts',
      lineNumber: 1,
    },
  })

  return GraphDiagnostics.fromGraph(builder.build())
}

function firstResult<T>(results: readonly T[]): T {
  const first = results[0]
  if (first === undefined) throw new TestAssertionError('Expected at least one result')
  return first
}

describe('GraphDiagnostics.nearMatches', () => {
  describe('same name, wrong type (most common mistake)', () => {
    it('exact name with wrong type returns match with type mismatch', () => {
      const diagnostics = createGraphDiagnostics()
      const query = {
        name: 'OrderPlaced',
        type: 'UseCase' as const,
      }
      const results = diagnostics.nearMatches(query)

      expect(results.length).toBeGreaterThan(0)
      const first = firstResult(results)
      expect(first.component.name).toBe('OrderPlaced')
      expect(first.component.type).toBe('Event')
      expect(first.mismatch).toStrictEqual({
        field: 'type',
        expected: 'UseCase',
        actual: 'Event',
      })
    })

    it('UseCase found when Event expected', () => {
      const diagnostics = createGraphDiagnostics()
      const query = {
        name: 'OrderService',
        type: 'Event' as const,
      }
      const results = diagnostics.nearMatches(query)

      expect(results.length).toBeGreaterThan(0)
      const first = firstResult(results)
      expect(first.component.name).toBe('OrderService')
      expect(first.component.type).toBe('UseCase')
      expect(first.mismatch).toStrictEqual({
        field: 'type',
        expected: 'Event',
        actual: 'UseCase',
      })
    })
  })

  describe('same name, wrong domain (common mistake)', () => {
    it.each([
      [
        {
          name: 'OrderService',
          domain: 'shipping',
        },
        {
          expectedName: 'OrderService',
          expectedDomain: 'orders',
          mismatchField: 'domain',
        },
        'exact name with wrong domain returns match with domain mismatch',
      ],
    ])('nearMatches(%o) - %s', (query, expected) => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches(query)

      expect(results.length).toBeGreaterThan(0)
      const first = firstResult(results)
      expect(first.component.name).toBe(expected.expectedName)
      expect(first.component.domain).toBe(expected.expectedDomain)
      expect(first.mismatch).toStrictEqual({
        field: expected.mismatchField,
        expected: query.domain,
        actual: expected.expectedDomain,
      })
    })
  })

  describe('name typos', () => {
    it.each([
      [{ name: 'OrdrService' }, 'OrderService', 'single typo finds match'],
      [{ name: 'OrderServce' }, 'OrderService', 'missing char finds match'],
      [{ name: 'OrderSerivce' }, 'OrderService', 'transposed chars finds match'],
      [{ name: 'Paymentservice' }, 'PaymentService', 'case difference finds match'],
    ])('nearMatches(%o) finds "%s" - %s', (query, expectedName) => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches(query)

      expect(results.length).toBeGreaterThan(0)
      const first = firstResult(results)
      expect(first.component.name).toBe(expectedName)
      expect(first.mismatch).toBeUndefined()
    })
  })

  describe('no matches', () => {
    it.each([
      [{ name: 'XYZ123' }, 'completely different returns empty'],
      [{ name: 'Foo' }, 'short unrelated returns empty'],
      [{ name: '' }, 'empty name returns empty'],
    ])('nearMatches(%o) returns [] - %s', (query) => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches(query)

      expect(results).toStrictEqual([])
    })
  })

  describe('multiple matches sorted by score', () => {
    it('returns multiple results sorted by score descending', () => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches({ name: 'Service' }, { threshold: 0.3 })

      expect(results).toHaveLength(4)
      expect(results.map((r) => r.component.name)).toStrictEqual([
        'OrderService',
        'PaymentService',
        'ShippingService',
        'OrderPlaced',
      ])
    })

    it('returns exact match first, then by similarity', () => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches({ name: 'OrderServic' })

      expect(results.length).toBeGreaterThan(0)
      const first = firstResult(results)
      expect(first.component.name).toBe('OrderService')
      // Name doesn't match exactly, no mismatch detected
      expect(first.mismatch).toBeUndefined()
    })

    it('exact name match has score 1.0', () => {
      const diagnostics = createGraphDiagnostics()
      const results = diagnostics.nearMatches({ name: 'OrderService' })

      const first = firstResult(results)
      expect(first.component.name).toBe('OrderService')
      expect(first.score).toBe(1.0)
    })
  })

  describe('options', () => {
    it('respects threshold option', () => {
      const diagnostics = createGraphDiagnostics()
      // Very high threshold should exclude partial matches
      const results = diagnostics.nearMatches({ name: 'OrderServic' }, { threshold: 0.99 })

      expect(results).toStrictEqual([])
    })

    it('respects limit option', () => {
      const diagnostics = createGraphDiagnostics()
      // Lower threshold to get multiple matches, then limit to 1
      const results = diagnostics.nearMatches({ name: 'OrderService' }, { limit: 1 })

      expect(results).toHaveLength(1)
    })
  })
})
