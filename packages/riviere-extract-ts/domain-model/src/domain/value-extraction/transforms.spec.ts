import type { ExtractionTransform } from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it } from 'vitest'
import { applyTransforms } from './transforms'

describe('stripSuffix', () => {
  it("returns 'PlaceOrder' when input is 'PlaceOrderController' and suffix is 'Controller'", () => {
    expect(applyTransforms('PlaceOrderController', { stripSuffix: 'Controller' })).toBe(
      'PlaceOrder',
    )
  })

  it('returns original when suffix not present', () => {
    expect(applyTransforms('OrderService', { stripSuffix: 'Controller' })).toBe('OrderService')
  })

  it('returns empty string when input equals suffix', () => {
    expect(applyTransforms('Controller', { stripSuffix: 'Controller' })).toBe('')
  })
})

describe('stripPrefix', () => {
  it("returns 'EventHandler' when input is 'IEventHandler' and prefix is 'I'", () => {
    expect(applyTransforms('IEventHandler', { stripPrefix: 'I' })).toBe('EventHandler')
  })

  it('returns original when prefix not present', () => {
    expect(applyTransforms('EventHandler', { stripPrefix: 'I' })).toBe('EventHandler')
  })
})

describe('toLowerCase', () => {
  it("returns 'placeorder' when input is 'PlaceOrder'", () => {
    expect(applyTransforms('PlaceOrder', { toLowerCase: true })).toBe('placeorder')
  })
})

describe('toUpperCase', () => {
  it("returns 'PLACEORDER' when input is 'PlaceOrder'", () => {
    expect(applyTransforms('PlaceOrder', { toUpperCase: true })).toBe('PLACEORDER')
  })
})

describe('kebabToPascal', () => {
  it("returns 'OrderPlaced' when input is 'order-placed'", () => {
    expect(applyTransforms('order-placed', { kebabToPascal: true })).toBe('OrderPlaced')
  })

  it("returns 'PlaceOrder' when input is 'place-order'", () => {
    expect(applyTransforms('place-order', { kebabToPascal: true })).toBe('PlaceOrder')
  })
})

describe('pascalToKebab', () => {
  it("returns 'order-placed' when input is 'OrderPlaced'", () => {
    expect(applyTransforms('OrderPlaced', { pascalToKebab: true })).toBe('order-placed')
  })

  it("returns 'place-order' when input is 'PlaceOrder'", () => {
    expect(applyTransforms('PlaceOrder', { pascalToKebab: true })).toBe('place-order')
  })

  it("returns 'order-placed' when input is 'orderPlaced' (camelCase)", () => {
    expect(applyTransforms('orderPlaced', { pascalToKebab: true })).toBe('order-placed')
  })

  it("returns 'lowercase' when input is 'lowercase'", () => {
    expect(applyTransforms('lowercase', { pascalToKebab: true })).toBe('lowercase')
  })
})

describe('applyTransforms', () => {
  it('applies transforms in YAML order (top-to-bottom)', () => {
    const transform: ExtractionTransform = {
      stripSuffix: 'Controller',
      toLowerCase: true,
    }
    expect(applyTransforms('PlaceOrderController', transform)).toBe('placeorder')
  })

  it('returns original when transform object is empty', () => {
    expect(applyTransforms('PlaceOrder', {})).toBe('PlaceOrder')
  })

  it('applies stripPrefix correctly', () => {
    const transform: ExtractionTransform = { stripPrefix: 'I' }
    expect(applyTransforms('IEventHandler', transform)).toBe('EventHandler')
  })

  it('applies toUpperCase correctly', () => {
    const transform: ExtractionTransform = { toUpperCase: true }
    expect(applyTransforms('PlaceOrder', transform)).toBe('PLACEORDER')
  })

  it('applies kebabToPascal correctly', () => {
    const transform: ExtractionTransform = { kebabToPascal: true }
    expect(applyTransforms('order-placed', transform)).toBe('OrderPlaced')
  })

  it('applies pascalToKebab correctly', () => {
    const transform: ExtractionTransform = { pascalToKebab: true }
    expect(applyTransforms('OrderPlaced', transform)).toBe('order-placed')
  })
})
