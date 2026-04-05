import {
  describe, expect, it 
} from 'vitest'
import {
  createDomainInput, isAddComponentValidationError 
} from './add-component-input-factory'

function captureThrownValue(call: () => unknown): unknown {
  try {
    call()
  } catch (error) {
    return error
  }

  return undefined
}

describe('add-component-input-factory', () => {
  const baseInput = {
    componentType: 'API',
    domain: 'orders',
    filePath: 'src/api/orders.ts',
    module: 'api',
    name: 'Orders API',
    repository: 'https://github.com/org/repo',
  }

  it('omits optional API path when httpPath is undefined', () => {
    const result = createDomainInput({
      ...baseInput,
      apiType: 'REST',
      description: 'Order endpoints',
      httpMethod: 'GET',
    })

    expect(result).toMatchObject({
      input: {
        apiType: 'REST',
        description: 'Order endpoints',
        httpMethod: 'GET',
      },
      type: 'API',
    })
    expect('path' in result.input).toBe(false)
  })

  it('throws validation error for unsupported API http methods', () => {
    const call = () =>
      createDomainInput({
        ...baseInput,
        apiType: 'REST',
        httpMethod: 'TRACE',
      })

    expect(call).toThrow('--http-method is required for API component')
    const caughtError = captureThrownValue(call)
    expect(isAddComponentValidationError(caughtError)).toBe(true)
  })

  it('throws validation error when subscribed events are empty', () => {
    const call = () =>
      createDomainInput({
        ...baseInput,
        componentType: 'EventHandler',
        subscribedEvents: ' , ',
      })

    expect(call).toThrow('--subscribed-events is required for EventHandler component')
  })

  it('supports graphql, other, and remaining http methods', () => {
    expect(
      createDomainInput({
        ...baseInput,
        apiType: 'graphql',
        httpMethod: 'PUT',
      }),
    ).toMatchObject({
      input: {
        apiType: 'GraphQL',
        httpMethod: 'PUT',
      },
    })

    expect(
      createDomainInput({
        ...baseInput,
        apiType: 'other',
        httpMethod: 'DELETE',
      }),
    ).toMatchObject({
      input: {
        apiType: 'other',
        httpMethod: 'DELETE',
      },
    })

    expect(
      createDomainInput({
        ...baseInput,
        apiType: 'REST',
        httpMethod: 'PATCH',
      }),
    ).toMatchObject({
      input: {
        apiType: 'REST',
        httpMethod: 'PATCH',
      },
    })
  })

  it('throws for invalid component and api types', () => {
    expect(() =>
      createDomainInput({
        ...baseInput,
        componentType: 'Unknown',
      }),
    ).toThrow('Invalid component type: Unknown')

    expect(() =>
      createDomainInput({
        ...baseInput,
        apiType: 'SOAP',
        httpMethod: 'GET',
      }),
    ).toThrow('--api-type is required for API component')
  })
})
