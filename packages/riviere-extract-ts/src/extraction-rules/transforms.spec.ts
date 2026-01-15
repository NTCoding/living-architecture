import {
  describe, it, expect 
} from 'vitest'
import {
  stripSuffix,
  stripPrefix,
  toLowerCase,
  toUpperCase,
  kebabToPascal,
  pascalToKebab,
  applyTransforms,
} from './transforms'
import type { Transform } from '@living-architecture/riviere-extract-config'

describe('stripSuffix', () => {
  it("returns 'PlaceOrder' when input is 'PlaceOrderController' and suffix is 'Controller'", () => {
    expect(stripSuffix('PlaceOrderController', 'Controller')).toBe('PlaceOrder')
  })

  it('returns original when suffix not present', () => {
    expect(stripSuffix('OrderService', 'Controller')).toBe('OrderService')
  })

  it('returns empty string when input equals suffix', () => {
    expect(stripSuffix('Controller', 'Controller')).toBe('')
  })
})

describe('stripPrefix', () => {
  it("returns 'EventHandler' when input is 'IEventHandler' and prefix is 'I'", () => {
    expect(stripPrefix('IEventHandler', 'I')).toBe('EventHandler')
  })

  it('returns original when prefix not present', () => {
    expect(stripPrefix('EventHandler', 'I')).toBe('EventHandler')
  })
})

describe('toLowerCase', () => {
  it("returns 'placeorder' when input is 'PlaceOrder'", () => {
    expect(toLowerCase('PlaceOrder')).toBe('placeorder')
  })
})

describe('toUpperCase', () => {
  it("returns 'PLACEORDER' when input is 'PlaceOrder'", () => {
    expect(toUpperCase('PlaceOrder')).toBe('PLACEORDER')
  })
})

describe('kebabToPascal', () => {
  it("returns 'OrderPlaced' when input is 'order-placed'", () => {
    expect(kebabToPascal('order-placed')).toBe('OrderPlaced')
  })

  it("returns 'PlaceOrder' when input is 'place-order'", () => {
    expect(kebabToPascal('place-order')).toBe('PlaceOrder')
  })
})

describe('pascalToKebab', () => {
  it("returns 'order-placed' when input is 'OrderPlaced'", () => {
    expect(pascalToKebab('OrderPlaced')).toBe('order-placed')
  })

  it("returns 'place-order' when input is 'PlaceOrder'", () => {
    expect(pascalToKebab('PlaceOrder')).toBe('place-order')
  })
})

describe('applyTransforms', () => {
  it('applies transforms in YAML order (top-to-bottom)', () => {
    const transform: Transform = {
      stripSuffix: 'Controller',
      toLowerCase: true,
    }
    expect(applyTransforms('PlaceOrderController', transform)).toBe('placeorder')
  })

  it('returns original when transform object is empty', () => {
    expect(applyTransforms('PlaceOrder', {})).toBe('PlaceOrder')
  })

  it('applies stripPrefix correctly', () => {
    const transform: Transform = { stripPrefix: 'I' }
    expect(applyTransforms('IEventHandler', transform)).toBe('EventHandler')
  })

  it('applies toUpperCase correctly', () => {
    const transform: Transform = { toUpperCase: true }
    expect(applyTransforms('PlaceOrder', transform)).toBe('PLACEORDER')
  })

  it('applies kebabToPascal correctly', () => {
    const transform: Transform = { kebabToPascal: true }
    expect(applyTransforms('order-placed', transform)).toBe('OrderPlaced')
  })

  it('applies pascalToKebab correctly', () => {
    const transform: Transform = { pascalToKebab: true }
    expect(applyTransforms('OrderPlaced', transform)).toBe('order-placed')
  })
})
