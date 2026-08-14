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

  it('rejects an unsupported API type', () => {
    expect(ApiDefinition.parse('SOAP', undefined, '/orders')).toMatchObject({
      success: false,
      message: '--api-type is required for API component',
    })
  })

  it('rejects a missing API type', () => {
    expect(ApiDefinition.parse(undefined, undefined, '/orders')).toMatchObject({
      success: false,
      message: '--api-type is required for API component',
    })
  })

  it('accepts a supported HTTP method', () => {
    expect(ApiDefinition.parse('REST', 'POST', '/orders')).toMatchObject({
      success: true,
      data: { apiType: 'REST', httpMethod: 'POST', path: '/orders' },
    })
  })
})
