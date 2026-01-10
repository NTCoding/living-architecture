import {
  describe, it, expect 
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { RiviereBuilder } from './builder'
import {
  createValidOptions, createSourceLocation 
} from './builder-test-fixtures'

describe('RiviereBuilder', () => {
  describe('serialize', () => {
    it('returns valid JSON string when builder has no components', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const serialized = builder.serialize()

      expect(() => {
        JSON.parse(serialized)
      }).not.toThrow()
      expect(serialized).toContain('"version": "1.0"')
      expect(serialized).toContain('"components": []')
      expect(serialized).toContain('"links": []')
    })

    it('includes component data when builder has components', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      builder.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })

      const serialized = builder.serialize()

      expect(serialized).toContain('"name": "Create Order"')
      expect(serialized).toContain('"type": "API"')
      expect(serialized).toContain('"apiType": "REST"')
    })

    it('includes custom types when defined', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      builder.defineCustomType({
        name: 'Repository',
        requiredProperties: {
          entityName: {
            type: 'string',
            description: 'Entity managed',
          },
        },
      })

      const serialized = builder.serialize()

      expect(serialized).toContain('"Repository"')
      expect(serialized).toContain('"entityName"')
    })

    it('includes links when components are connected', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const source = builder.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })
      builder.link({
        from: source.id,
        to: target.id,
        type: 'sync',
      })

      const serialized = builder.serialize()

      expect(serialized).toContain(`"source": "${source.id}"`)
      expect(serialized).toContain(`"target": "${target.id}"`)
      expect(serialized).toContain('"type": "sync"')
    })

    it('includes external links when present', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const source = builder.addApi({
        name: 'Payment API',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe' },
      })

      const serialized = builder.serialize()

      expect(serialized).toContain('"externalLinks"')
      expect(serialized).toContain('"Stripe"')
    })

    it('includes enrichments on DomainOp components', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const op = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })
      builder.enrichComponent(op.id, {
        entity: 'Order',
        stateChanges: [
          {
            from: 'draft',
            to: 'pending',
          },
        ],
        businessRules: ['Order must have at least one item'],
      })

      const serialized = builder.serialize()

      expect(serialized).toContain('"entity": "Order"')
      expect(serialized).toContain('"from": "draft"')
      expect(serialized).toContain('"to": "pending"')
      expect(serialized).toContain('Order must have at least one item')
    })

    it('serializes stateChanges and businessRules arrays', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const op = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })
      builder.enrichComponent(op.id, {
        entity: 'Order',
        stateChanges: [
          {
            from: 'draft',
            to: 'pending',
          },
        ],
        businessRules: ['Order must have at least one item'],
      })

      const serialized = builder.serialize()

      expect(serialized).toContain('"stateChanges"')
      expect(serialized).toContain('"businessRules"')
    })

    it('returns pretty-printed JSON with 2-space indentation', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const serialized = builder.serialize()

      expect(serialized).toContain('  "version"')
      expect(serialized).toContain('    "sources"')
    })
  })

  describe('resume', () => {
    it('restores builder from serialized empty graph', () => {
      const original = RiviereBuilder.new(createValidOptions())
      const serialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(serialized))

      expect(resumed.stats().componentCount).toBe(0)
      expect(resumed.stats().linkCount).toBe(0)
    })

    it('preserves components from serialized graph', () => {
      const original = RiviereBuilder.new(createValidOptions())
      original.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const serialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(serialized))

      expect(resumed.stats().componentCount).toBe(1)
      expect(resumed.stats().componentsByType.API).toBe(1)
    })

    it('allows continued building after resume', () => {
      const original = RiviereBuilder.new(createValidOptions())
      original.addApi({
        name: 'First API',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const serialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(serialized))
      resumed.addApi({
        name: 'Second API',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })

      expect(resumed.stats().componentCount).toBe(2)
      expect(resumed.stats().componentsByType.API).toBe(2)
    })

    it('preserves custom types from serialized graph', () => {
      const original = RiviereBuilder.new(createValidOptions())
      original.defineCustomType({
        name: 'Repository',
        requiredProperties: {
          entityName: {
            type: 'string',
            description: 'Entity managed',
          },
        },
      })
      const serialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(serialized))
      resumed.addCustom({
        customTypeName: 'Repository',
        name: 'Order Repository',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
        metadata: { entityName: 'Order' },
      })

      expect(resumed.stats().componentCount).toBe(1)
      expect(resumed.stats().componentsByType.Custom).toBe(1)
    })

    it('allows continued linking after resume', () => {
      const original = RiviereBuilder.new(createValidOptions())
      const api = original.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const useCase = original.addUseCase({
        name: 'Process Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      })
      original.link({
        from: api.id,
        to: useCase.id,
        type: 'sync',
      })
      const serialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(serialized))
      const domainOp = resumed.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })
      resumed.link({
        from: useCase.id,
        to: domainOp.id,
      })

      expect(resumed.stats().linkCount).toBe(2)
      expect(resumed.stats().componentCount).toBe(3)
    })

    it('throws clear error when graph has no sources', () => {
      const invalidGraph = {
        version: '1.0',
        metadata: {
          sources: [],
          domains: {},
        },
        components: [],
        links: [],
      }

      expect(() => RiviereBuilder.resume(invalidGraph)).toThrow('Invalid graph: missing sources')
    })

    it('throws clear error when graph metadata is missing sources', () => {
      const invalidGraph = {
        version: '1.0',
        metadata: { domains: {} },
        components: [],
        links: [],
      }

      expect(() => RiviereBuilder.resume(invalidGraph)).toThrow('Invalid graph: missing sources')
    })

    it('normalizes graph without optional customTypes and externalLinks', () => {
      const minimalGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
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
          },
        },
        components: [],
        links: [],
      }

      const resumed = RiviereBuilder.resume(minimalGraph)

      expect(resumed.stats().componentCount).toBe(0)
      expect(resumed.serialize()).toContain('"customTypes": {}')
      expect(resumed.serialize()).toContain('"externalLinks": []')
    })
  })

  describe('round-trip', () => {
    it('produces identical output when serialize then resume then serialize', () => {
      const original = RiviereBuilder.new(createValidOptions())
      original.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const target = original.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })
      original.enrichComponent(target.id, {
        entity: 'Order',
        stateChanges: [
          {
            from: 'draft',
            to: 'pending',
          },
        ],
        businessRules: ['Order must have items'],
      })
      const firstSerialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(firstSerialized))
      const secondSerialized = resumed.serialize()

      expect(secondSerialized).toBe(firstSerialized)
    })

    it('round-trips empty builder correctly', () => {
      const original = RiviereBuilder.new(createValidOptions())
      const firstSerialized = original.serialize()

      const resumed = RiviereBuilder.resume(JSON.parse(firstSerialized))
      const secondSerialized = resumed.serialize()

      expect(secondSerialized).toBe(firstSerialized)
    })
  })
})
