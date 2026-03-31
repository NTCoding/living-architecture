import {
  describe, it, expect 
} from 'vitest'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { categorizeComponents } from './categorize-components'

function createDraftComponent(type: string, name: string, domain: string): DraftComponent {
  return {
    type,
    name,
    domain,
    location: {
      file: '/test/file.ts',
      line: 1,
    },
  }
}

describe('categorizeComponents', () => {
  it('returns all components as added when baseline is undefined', () => {
    const current = [
      createDraftComponent('useCase', 'PlaceOrder', 'orders'),
      createDraftComponent('api', 'OrderController', 'orders'),
    ]

    const result = categorizeComponents(current, undefined)

    expect(result.added).toHaveLength(2)
    expect(result.modified).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.added).toStrictEqual([
      {
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      },
      {
        type: 'api',
        name: 'OrderController',
        domain: 'orders',
      },
    ])
  })

  it('returns empty added when current is empty and baseline is undefined', () => {
    const result = categorizeComponents([], undefined)

    expect(result.added).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
  })

  it('identifies added components when compared to baseline', () => {
    const baseline = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]
    const current = [
      createDraftComponent('useCase', 'PlaceOrder', 'orders'),
      createDraftComponent('api', 'OrderController', 'orders'),
    ]

    const result = categorizeComponents(current, baseline)

    expect(result.added).toHaveLength(1)
    expect(result.added[0]).toStrictEqual({
      type: 'api',
      name: 'OrderController',
      domain: 'orders',
    })
  })

  it('identifies removed components when compared to baseline', () => {
    const baseline = [
      createDraftComponent('useCase', 'PlaceOrder', 'orders'),
      createDraftComponent('api', 'OrderController', 'orders'),
    ]
    const current = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]

    const result = categorizeComponents(current, baseline)

    expect(result.removed).toHaveLength(1)
    expect(result.removed[0]).toStrictEqual({
      type: 'api',
      name: 'OrderController',
      domain: 'orders',
    })
  })

  it('returns empty modified array (modification detection not implemented)', () => {
    const baseline = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]
    const current = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]

    const result = categorizeComponents(current, baseline)

    expect(result.modified).toHaveLength(0)
  })

  it('handles both added and removed components in same comparison', () => {
    const baseline = [
      createDraftComponent('useCase', 'PlaceOrder', 'orders'),
      createDraftComponent('api', 'OrderController', 'orders'),
    ]
    const current = [
      createDraftComponent('useCase', 'PlaceOrder', 'orders'),
      createDraftComponent('useCase', 'CancelOrder', 'orders'),
    ]

    const result = categorizeComponents(current, baseline)

    expect(result.added).toHaveLength(1)
    expect(result.removed).toHaveLength(1)
    expect(result.added[0]?.name).toBe('CancelOrder')
    expect(result.removed[0]?.name).toBe('OrderController')
  })

  it('distinguishes components by domain, type, and name combination', () => {
    const baseline = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]
    const current = [createDraftComponent('useCase', 'PlaceOrder', 'shipping')]

    const result = categorizeComponents(current, baseline)

    expect(result.added).toHaveLength(1)
    expect(result.removed).toHaveLength(1)
  })

  it('handles empty baseline array', () => {
    const current = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]

    const result = categorizeComponents(current, [])

    expect(result.added).toHaveLength(1)
    expect(result.removed).toHaveLength(0)
  })

  it('handles empty current array with non-empty baseline', () => {
    const baseline = [createDraftComponent('useCase', 'PlaceOrder', 'orders')]

    const result = categorizeComponents([], baseline)

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(1)
  })
})
