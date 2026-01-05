import {
 describe, it, expect 
} from 'vitest'
import {
 pluralize, pluralizeComponent, pluralizeConnection 
} from './pluralize'

describe('pluralize', () => {
  it('returns singular form for count of 1', () => {
    expect(pluralize(1, 'item', 'items')).toBe('1 item')
  })

  it('returns plural form for count of 0', () => {
    expect(pluralize(0, 'item', 'items')).toBe('0 items')
  })

  it('returns plural form for count greater than 1', () => {
    expect(pluralize(5, 'item', 'items')).toBe('5 items')
  })

  it('returns plural form for negative numbers', () => {
    expect(pluralize(-1, 'item', 'items')).toBe('-1 items')
  })

  it('returns plural form for very large numbers', () => {
    expect(pluralize(999999, 'item', 'items')).toBe('999999 items')
  })
})

describe('pluralizeComponent', () => {
  it('returns singular for 1 component', () => {
    expect(pluralizeComponent(1)).toBe('1 component')
  })

  it('returns plural for multiple components', () => {
    expect(pluralizeComponent(5)).toBe('5 components')
  })
})

describe('pluralizeConnection', () => {
  it('returns singular for 1 connection', () => {
    expect(pluralizeConnection(1)).toBe('1 connection')
  })

  it('returns plural for multiple connections', () => {
    expect(pluralizeConnection(5)).toBe('5 connections')
  })
})
