import assert from 'node:assert/strict'
import { CustomPropertyType } from './custom-property-type'

function parsePropertyType(value: string): CustomPropertyType {
  const result = CustomPropertyType.parse(value)
  assert.equal(result.success, true)
  return result.propertyType
}

describe('CustomPropertyType', () => {
  it.each(['string', 'number', 'boolean', 'array', 'object'])(
    'parses the published property type %s',
    (value) => {
      expect(parsePropertyType(value).name()).toBe(value)
    },
  )

  it('returns the invalid value when parsing fails', () => {
    expect(CustomPropertyType.parse('date')).toStrictEqual({
      success: false,
      invalidValue: 'date',
    })
  })

  it('lists every supported property type name', () => {
    expect(CustomPropertyType.names()).toStrictEqual([
      'string',
      'number',
      'boolean',
      'array',
      'object',
    ])
  })
})
