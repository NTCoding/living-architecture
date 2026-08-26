import { assert, describe, expect, it } from 'vitest'
import { ExtractionTransform } from './extraction-transform'

function parseTransform(input: unknown): ExtractionTransform {
  const result = ExtractionTransform.parse(input)
  assert(result.success)
  return result.data
}

describe('ExtractionTransform', () => {
  it.each([
    ['PlaceOrderController', { stripSuffix: 'Controller' }, 'PlaceOrder'],
    ['OrderService', { stripSuffix: 'Controller' }, 'OrderService'],
    ['Controller', { stripSuffix: 'Controller' }, ''],
    ['IEventHandler', { stripPrefix: 'I' }, 'EventHandler'],
    ['EventHandler', { stripPrefix: 'I' }, 'EventHandler'],
    ['PlaceOrder', { toLowerCase: true }, 'placeorder'],
    ['PlaceOrder', { toUpperCase: true }, 'PLACEORDER'],
    ['order-placed', { kebabToPascal: true }, 'OrderPlaced'],
    ['place-order', { kebabToPascal: true }, 'PlaceOrder'],
    ['OrderPlaced', { pascalToKebab: true }, 'order-placed'],
    ['placeOrder', { pascalToKebab: true }, 'place-order'],
    ['lowercase', { pascalToKebab: true }, 'lowercase'],
  ])('transforms %s using %j into %s', (sourceText, input, expected) => {
    expect(parseTransform(input).applyTo(sourceText)).toBe(expected)
  })

  it('applies configured transformations in their defined order', () => {
    const transform = parseTransform({
      stripSuffix: 'Controller',
      stripPrefix: 'I',
      toLowerCase: true,
    })

    expect(transform.applyTo('IPlaceOrderController')).toBe('placeorder')
  })

  it('preserves source text when no transformations are configured', () => {
    expect(parseTransform({}).applyTo('PlaceOrder')).toBe('PlaceOrder')
  })

  it('rejects unknown transformation values', () => {
    expect(ExtractionTransform.parse({ unknownTransform: true }).success).toBe(false)
  })
})
