import { BuilderOptions } from './riviere-graph-definition-input'
import { describe, it, expect } from 'vitest'
import { RiviereBuilder } from './riviere-builder'

function createValidOptions() {
  return BuilderOptions.parse({
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
  } as const)
}

describe('RiviereBuilder', () => {
  describe('upsertLink', () => {
    it('creates a link when source and target components exist', () => {
      const builder = RiviereBuilder.parse(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: {
          repository: 'test/repo',
          filePath: 'src/create-order.ts',
        },
      })

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: {
          repository: 'test/repo',
          filePath: 'src/save-order.ts',
        },
      })

      const result = builder.upsertLink({
        from: source.id,
        to: target.id,
        type: 'async',
      })

      expect(result.created).toBe(true)
      expect(result.link.source).toBe(source.id)
      expect(result.link.target).toBe(target.id)
      expect(result.link.type).toBe('async')
    })

    it('returns the existing link when a duplicate is added', () => {
      const builder = RiviereBuilder.parse(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: {
          repository: 'test/repo',
          filePath: 'src/create-order.ts',
        },
      })

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: {
          repository: 'test/repo',
          filePath: 'src/save-order.ts',
        },
      })

      const first = builder.upsertLink({
        from: source.id,
        to: target.id,
        type: 'async',
      })
      const duplicate = builder.upsertLink({
        from: source.id,
        to: target.id,
        type: 'async',
      })

      expect(first.created).toBe(true)
      expect(duplicate.created).toBe(false)
      expect(duplicate.link).toStrictEqual(first.link)
      expect(builder.build().links).toHaveLength(1)
    })

    it('throws when source component does not exist', () => {
      const builder = RiviereBuilder.parse(createValidOptions())

      expect(() =>
        builder.upsertLink({
          from: 'nonexistent:module:usecase:foo',
          to: 'any:target:id',
        }),
      ).toThrow("Source component 'nonexistent:module:usecase:foo' not found")
    })

    it('includes the relationship type when provided', () => {
      const builder = RiviereBuilder.parse(createValidOptions())
      builder.defineRelationshipType({ name: 'executes', description: 'Executes' })

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: {
          repository: 'test/repo',
          filePath: 'src/create-order.ts',
        },
      })

      const result = builder.upsertLink({
        from: source.id,
        to: 'any:target:id',
        relationshipType: 'executes',
      })

      expect(result.created).toBe(true)
      expect(result.link.relationshipType).toBe('executes')
    })
  })
})
