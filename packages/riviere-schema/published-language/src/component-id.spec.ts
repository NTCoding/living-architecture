import { ComponentId } from './published-language/component-id'

describe('ComponentId', () => {
  describe('parseFromParts', () => {
    it('parses an ID from its parts', () => {
      const componentId = ComponentId.parseFromParts({
        domain: 'orders',
        module: 'checkout',
        type: 'domainop',
        name: 'Place Order',
      })

      expect(componentId.toString()).toBe('orders:checkout:domainop:place-order')
    })

    it('lowercases and hyphenates the component name', () => {
      const componentId = ComponentId.parseFromParts({
        domain: 'orders',
        module: 'checkout',
        type: 'usecase',
        name: 'Handle Customer Request',
      })

      expect(componentId.toString()).toBe('orders:checkout:usecase:handle-customer-request')
      expect(componentId.name()).toBe('handle-customer-request')
    })
  })

  describe('parse', () => {
    it('returns a component ID for a valid value', () => {
      const result = ComponentId.parse('orders:checkout:domainop:place-order')

      expect(result).toStrictEqual({
        componentId: ComponentId.parseFromParts({
          domain: 'orders',
          module: 'checkout',
          type: 'domainop',
          name: 'place-order',
        }),
        success: true,
      })
    })

    it.each(['orders:checkout', 'orders:checkout:domainop:place:order', ''])(
      'returns the validation failure for invalid value %j',
      (value) => {
        const result = ComponentId.parse(value)

        expect(result).toStrictEqual({
          success: false,
          invalidValue: value,
          message: `Invalid component ID format: '${value}'. Expected 'domain:module:type:name'`,
        })
      },
    )
  })
})
