import { describe, expect, it } from 'vitest'
import { ApiDefinition } from './api-definition'

describe('ApiDefinition', () => {
  it.each([
    ['rest', 'REST'],
    ['GraphQL', 'GraphQL'],
    ['OTHER', 'other'],
  ])('normalises %s', (input, expected) => {
    const result = ApiDefinition.parse(input, undefined, undefined)

    expect(result).toMatchObject({ success: true, data: { apiType: expected } })
  })

  it('rejects an unsupported HTTP method', () => {
    expect(ApiDefinition.parse('REST', 'TRACE', '/orders')).toMatchObject({
      success: false,
      message: '--http-method is required for API component',
    })
  })
})
