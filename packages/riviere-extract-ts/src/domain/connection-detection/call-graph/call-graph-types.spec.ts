import {
  describe, it, expect 
} from 'vitest'
import {
  componentIdentity, stripGenericArgs 
} from './call-graph-types'
import { buildComponent } from './call-graph-fixtures'

describe('stripGenericArgs', () => {
  it('returns original string when no generic arguments present', () => {
    expect(stripGenericArgs('OrderRepository')).toBe('OrderRepository')
  })

  it('strips generic arguments from type name', () => {
    expect(stripGenericArgs('Repository<Order>')).toBe('Repository')
  })
})

describe('componentIdentity', () => {
  it('returns domain:type:name identity string', () => {
    const comp = buildComponent('MyComp', '/test.ts', 1, {
      domain: 'billing',
      type: 'api',
    })
    expect(componentIdentity(comp)).toBe('billing:api:MyComp')
  })
})
