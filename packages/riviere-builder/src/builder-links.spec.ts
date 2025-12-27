import { describe, it, expect } from 'vitest'
import { RiviereBuilder, type BuilderOptions } from './builder'

function createValidOptions(): BuilderOptions {
  return {
    sources: [{ repository: 'test/repo', commit: 'abc123' }],
    domains: {
      orders: { description: 'Order domain', systemType: 'domain' },
    },
  }
}

describe('RiviereBuilder', () => {
  describe('link', () => {
    it('creates link when source and target components exist', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: { repository: 'test/repo', filePath: 'src/save-order.ts' },
      })

      const link = builder.link({ from: source.id, to: target.id })

      expect(link.source).toBe(source.id)
      expect(link.target).toBe(target.id)
    })

    it('throws immediately when source component does not exist', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      expect(() =>
        builder.link({ from: 'nonexistent:module:usecase:foo', to: 'any:target:id' })
      ).toThrow("Source component 'nonexistent:module:usecase:foo' not found")
    })

    it('includes near-match suggestions when source has typo', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      expect(() =>
        builder.link({ from: 'orders:checkout:usecase:create-ordr', to: 'any:target:id' })
      ).toThrow(/Did you mean:.*orders:checkout:usecase:create-order/)
    })

    it('succeeds when target does not exist (deferred validation)', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const link = builder.link({ from: source.id, to: 'nonexistent:target:id' })

      expect(link.source).toBe(source.id)
      expect(link.target).toBe('nonexistent:target:id')
    })

    it('includes type when specified as sync', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const link = builder.link({ from: source.id, to: 'any:target:id', type: 'sync' })

      expect(link.type).toBe('sync')
    })

    it('includes type when specified as async', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const link = builder.link({ from: source.id, to: 'any:target:id', type: 'async' })

      expect(link.type).toBe('async')
    })

    it('omits type when not specified', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const link = builder.link({ from: source.id, to: 'any:target:id' })

      expect(link.type).toBeUndefined()
    })
  })

  describe('linkExternal', () => {
    it('creates external link when source exists', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const externalLink = builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API', domain: 'payments' },
      })

      expect(externalLink.source).toBe(source.id)
      expect(externalLink.target.name).toBe('Stripe API')
      expect(externalLink.target.domain).toBe('payments')
    })

    it('throws with near-match suggestions when source not found', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      expect(() =>
        builder.linkExternal({
          from: 'orders:checkout:usecase:create-ordr',
          target: { name: 'Stripe API' },
        })
      ).toThrow(/Did you mean:.*orders:checkout:usecase:create-order/)
    })

    it('stores target URL when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const externalLink = builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API', url: 'https://stripe.com/api' },
      })

      expect(externalLink.target.url).toBe('https://stripe.com/api')
    })

    it('includes optional fields when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'test/repo', filePath: 'src/create-order.ts' },
      })

      const externalLink = builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API' },
        type: 'async',
        description: 'Payment processing',
        sourceLocation: { repository: 'test/repo', filePath: 'src/stripe.ts' },
        metadata: { timeout: 30000 },
      })

      expect(externalLink.type).toBe('async')
      expect(externalLink.description).toBe('Payment processing')
      expect(externalLink.sourceLocation).toEqual({
        repository: 'test/repo',
        filePath: 'src/stripe.ts',
      })
      expect(externalLink.metadata).toEqual({ timeout: 30000 })
    })
  })
})
