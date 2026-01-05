import {
  describe, it, expect 
} from 'vitest'
import { RiviereBuilder } from './builder'
import {
  createValidOptions, createSourceLocation 
} from './builder-test-fixtures'

describe('RiviereBuilder', () => {
  describe('stats', () => {
    it('returns zero counts when graph has no components', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const stats = builder.stats()

      expect(stats.componentCount).toBe(0)
      expect(stats.componentsByType).toEqual({
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      })
      expect(stats.linkCount).toBe(0)
      expect(stats.externalLinkCount).toBe(0)
    })

    it('counts components by type correctly', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addApi({
        name: 'Order API',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })

      builder.addApi({
        name: 'Payment API',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })

      builder.addEvent({
        name: 'Order Created',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderCreated',
        sourceLocation: createSourceLocation(),
      })

      const stats = builder.stats()

      expect(stats.componentCount).toBe(3)
      expect(stats.componentsByType.API).toBe(2)
      expect(stats.componentsByType.Event).toBe(1)
      expect(stats.componentsByType.UseCase).toBe(0)
    })

    it('counts links correctly', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
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
      })

      const stats = builder.stats()

      expect(stats.linkCount).toBe(1)
    })

    it('counts external links correctly', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Payment Service',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      })

      builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API' },
      })

      builder.linkExternal({
        from: source.id,
        target: { name: 'PayPal API' },
      })

      const stats = builder.stats()

      expect(stats.externalLinkCount).toBe(2)
    })

    it('counts domains from metadata', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const stats = builder.stats()

      expect(stats.domainCount).toBe(2)
    })
  })

  describe('warnings', () => {
    it('returns empty array when no issues exist', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      })

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'shipping',
        module: 'core',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      })

      builder.link({
        from: source.id,
        to: target.id,
      })

      const warnings = builder.warnings()

      expect(warnings).toEqual([])
    })

    it('returns ORPHAN_COMPONENT warning for unlinked component', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const orphan = builder.addUseCase({
        name: 'Orphan Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      const linked = builder.addUseCase({
        name: 'Linked Service',
        domain: 'shipping',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      builder.linkExternal({
        from: linked.id,
        target: { name: 'External' },
      })

      const warnings = builder.warnings()

      const orphanWarnings = warnings.filter((w) => w.code === 'ORPHAN_COMPONENT')
      expect(orphanWarnings).toHaveLength(1)
      expect(orphanWarnings[0]).toMatchObject({
        code: 'ORPHAN_COMPONENT',
        componentId: orphan.id,
      })
      expect(orphanWarnings[0]?.message).toContain(orphan.id)
    })

    it('returns UNUSED_DOMAIN warning for domain with no components', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const comp = builder.addUseCase({
        name: 'Order Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      builder.linkExternal({
        from: comp.id,
        target: { name: 'External' },
      })

      const warnings = builder.warnings()

      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({
        code: 'UNUSED_DOMAIN',
        domainName: 'shipping',
      })
      expect(warnings[0]?.message).toContain('shipping')
    })

    it('returns multiple warnings for multiple issues', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addUseCase({
        name: 'Orphan Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      const warnings = builder.warnings()

      const orphanWarnings = warnings.filter((w) => w.code === 'ORPHAN_COMPONENT')
      const unusedDomainWarnings = warnings.filter((w) => w.code === 'UNUSED_DOMAIN')

      expect(orphanWarnings).toHaveLength(1)
      expect(unusedDomainWarnings).toHaveLength(1)
    })

    it('does not warn for component with any link', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      })

      builder.addUseCase({
        name: 'Another Service',
        domain: 'shipping',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      builder.linkExternal({
        from: source.id,
        target: { name: 'External' },
      })

      const warnings = builder.warnings()

      const orphanWarnings = warnings.filter((w) => w.code === 'ORPHAN_COMPONENT')
      expect(orphanWarnings).toHaveLength(1)
      expect(orphanWarnings[0]?.componentId).toContain('another-service')
    })

    it('does not warn for domain that has components', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      const source = builder.addUseCase({
        name: 'Order Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      const target = builder.addUseCase({
        name: 'Shipping Service',
        domain: 'shipping',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })

      builder.link({
        from: source.id,
        to: target.id,
      })

      const warnings = builder.warnings()

      const unusedDomainWarnings = warnings.filter((w) => w.code === 'UNUSED_DOMAIN')
      expect(unusedDomainWarnings).toHaveLength(0)
    })
  })

  describe('orphans', () => {
    it('returns empty array when all components are linked', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
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
      })
      expect(builder.orphans()).toEqual([])
    })

    it('returns component ID when component has no links', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const orphan = builder.addUseCase({
        name: 'Orphan Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      expect(builder.orphans()).toEqual([orphan.id])
    })

    it('excludes component that is link source', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const source = builder.addUseCase({
        name: 'Source Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      builder.link({
        from: source.id,
        to: 'nonexistent:target:id',
      })
      expect(builder.orphans()).toEqual([])
    })

    it('excludes component that is link target', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const target = builder.addDomainOp({
        name: 'Target Op',
        domain: 'orders',
        module: 'core',
        operationName: 'doSomething',
        sourceLocation: createSourceLocation(),
      })
      const source = builder.addUseCase({
        name: 'Source Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      builder.link({
        from: source.id,
        to: target.id,
      })
      expect(builder.orphans()).toEqual([])
    })

    it('excludes component that has external link only', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const source = builder.addUseCase({
        name: 'External Caller',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API' },
      })
      expect(builder.orphans()).toEqual([])
    })

    it('returns multiple IDs when multiple components have no links', () => {
      const builder = RiviereBuilder.new(createValidOptions())
      const orphan1 = builder.addUseCase({
        name: 'Orphan One',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      })
      const orphan2 = builder.addApi({
        name: 'Orphan Two',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        sourceLocation: createSourceLocation(),
      })
      const result = builder.orphans()
      expect(result).toContain(orphan1.id)
      expect(result).toContain(orphan2.id)
      expect(result).toHaveLength(2)
    })
  })
})
