import {
  describe, it, expect 
} from 'vitest'
import { ComponentNotFoundError } from './queries/errors'

describe('ComponentNotFoundError', () => {
  it('has message containing component ID', () => {
    const error = new ComponentNotFoundError('orders:checkout:api:place-order')

    expect(error.message).toBe("Component 'orders:checkout:api:place-order' not found")
  })

  it('exposes componentId property', () => {
    const error = new ComponentNotFoundError('orders:checkout:api:place-order')

    expect(error.componentId).toBe('orders:checkout:api:place-order')
  })

  it('defaults suggestions to empty array', () => {
    const error = new ComponentNotFoundError('orders:checkout:api:place-order')

    expect(error.suggestions).toStrictEqual([])
  })

  it('exposes provided suggestions', () => {
    const suggestions = ['orders:checkout:api:create-order', 'orders:checkout:api:get-order']
    const error = new ComponentNotFoundError('orders:checkout:api:place-ordr', suggestions)

    expect(error.suggestions).toStrictEqual(suggestions)
  })

  it('has name ComponentNotFoundError', () => {
    const error = new ComponentNotFoundError('any:id')

    expect(error.name).toBe('ComponentNotFoundError')
  })
})
