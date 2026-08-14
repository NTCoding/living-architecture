import { describe, expect, it } from 'vitest'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import { buildComponent as buildFixtureComponent } from './call-graph/__fixtures__/call-graph-fixtures'
import { ComponentIndex } from './component-index'

function buildComponent(overrides: Partial<EnrichedComponent> = {}): EnrichedComponent {
  return buildFixtureComponent('OrderService', 'src/order-service.ts', 10, overrides)
}

describe('ComponentIndex', () => {
  describe('isComponent', () => {
    it('returns false when built from empty array', () => {
      const index = ComponentIndex.parse([])

      expect(index.isComponent('OrderService')).toBe(false)
    })

    it('returns true when type name matches component name', () => {
      const index = ComponentIndex.parse([buildComponent({ name: 'OrderRepository' })])

      expect(index.isComponent('OrderRepository')).toBe(true)
    })

    it('returns false when type name matches no component', () => {
      const index = ComponentIndex.parse([buildComponent({ name: 'OrderRepository' })])

      expect(index.isComponent('PaymentService')).toBe(false)
    })

    it('matches generic type Repository<Order> to component named Repository', () => {
      const index = ComponentIndex.parse([buildComponent({ name: 'Repository' })])

      expect(index.isComponent('Repository<Order>')).toBe(true)
    })

    it('is case-sensitive: orderrepository does not match OrderRepository', () => {
      const index = ComponentIndex.parse([buildComponent({ name: 'OrderRepository' })])

      expect(index.isComponent('orderrepository')).toBe(false)
    })
  })

  describe('getComponentByTypeName', () => {
    it('returns component when type name matches', () => {
      const component = buildComponent({ name: 'OrderRepository' })
      const index = ComponentIndex.parse([component])

      expect(index.getComponentByTypeName('OrderRepository')).toStrictEqual(component)
    })

    it('returns undefined when type name matches no component', () => {
      const index = ComponentIndex.parse([buildComponent({ name: 'OrderRepository' })])

      expect(index.getComponentByTypeName('PaymentService')).toBeUndefined()
    })
  })

  describe('getComponentByLocation', () => {
    it('returns component by location for class-level component', () => {
      const component = buildComponent({
        name: 'OrderService',
        location: {
          file: 'src/order-service.ts',
          line: 5,
        },
      })
      const index = ComponentIndex.parse([component])

      expect(index.getComponentByLocation('src/order-service.ts', 5)).toStrictEqual(component)
    })

    it('returns component by location for method-level component', () => {
      const component = buildComponent({
        name: 'placeOrder',
        location: {
          file: 'src/order-service.ts',
          line: 20,
        },
      })
      const index = ComponentIndex.parse([component])

      expect(index.getComponentByLocation('src/order-service.ts', 20)).toStrictEqual(component)
    })

    it('returns undefined for unknown location', () => {
      const index = ComponentIndex.parse([
        buildComponent({
          location: {
            file: 'src/order-service.ts',
            line: 5,
          },
        }),
      ])

      expect(index.getComponentByLocation('src/unknown.ts', 99)).toBeUndefined()
    })
  })
})
