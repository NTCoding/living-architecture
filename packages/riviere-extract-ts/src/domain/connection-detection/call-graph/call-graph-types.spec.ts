import { describe, expect, it } from 'vitest'
import { buildComponent } from './call-graph-fixtures'
import { componentIdentity } from './component-identity'
import { stripGenericArgs } from './type-name-normalization'

describe('stripGenericArgs', () => {
  it('returns original string when no generic arguments present', () => {
    expect(stripGenericArgs('OrderRepository')).toBe('OrderRepository')
  })

  it('strips generic arguments from type name', () => {
    expect(stripGenericArgs('Repository<Order>')).toBe('Repository')
  })

  it('returns empty string for empty input', () => {
    expect(stripGenericArgs('')).toBe('')
  })

  it('strips nested generics from type name', () => {
    expect(stripGenericArgs('Map<K, List<V>>')).toBe('Map')
  })

  it('strips multiple type parameters from type name', () => {
    expect(stripGenericArgs('Pair<A, B>')).toBe('Pair')
  })
})

describe('componentIdentity', () => {
  it('returns domain:module:type:lowercasedname identity string', () => {
    const comp = buildComponent('MyComp', '/test.ts', 1, {
      domain: 'billing',
      type: 'api',
    })
    expect(componentIdentity(comp)).toBe('billing:orders-module:api:mycomp')
  })
})
