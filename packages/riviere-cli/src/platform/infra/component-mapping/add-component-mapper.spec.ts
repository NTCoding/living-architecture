import {
  describe, expect, it 
} from 'vitest'
import { buildDomainInput } from './add-component-mapper'
import {
  MissingRequiredOptionError, InvalidCustomPropertyError 
} from '../errors/errors'

describe('buildDomainInput', () => {
  const baseInput = {
    name: 'TestComponent',
    domain: 'test-domain',
    module: 'test-module',
    repository: 'test-repo',
    filePath: '/path/to/file.ts',
    graphPath: '/path/to/graph.json',
    outputJson: true,
  }

  it('throws MissingRequiredOptionError for unknown component type', () => {
    const input = {
      ...baseInput,
      componentType: 'InvalidType',
    }
    expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    expect(() => buildDomainInput(input)).toThrow('--type is required for Component component')
  })

  describe('successful mappings', () => {
    it('maps valid UI input with trimmed route', () => {
      const input = {
        ...baseInput,
        componentType: 'UI',
        route: '  /home  ',
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('UI')
      expect(result.input).toMatchObject({ route: '/home' })
    })

    it('maps UseCase with no required fields', () => {
      const input = {
        ...baseInput,
        componentType: 'UseCase',
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('UseCase')
    })

    it('includes optional httpPath and httpMethod for API', () => {
      const input = {
        ...baseInput,
        componentType: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        httpPath: '/users',
      }
      const result = buildDomainInput(input)
      expect(result.input).toMatchObject({
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/users',
      })
    })

    it('parses comma-separated subscribedEvents', () => {
      const input = {
        ...baseInput,
        componentType: 'EventHandler',
        subscribedEvents: 'EventA, EventB , EventC',
      }
      const result = buildDomainInput(input)
      expect(result.input).toMatchObject({ subscribedEvents: ['EventA', 'EventB', 'EventC'] })
    })

    it('maps valid DomainOp input with trimmed operationName', () => {
      const input = {
        ...baseInput,
        componentType: 'DomainOp',
        operationName: '  createOrder  ',
        entity: 'Order',
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('DomainOp')
      expect(result.input).toMatchObject({
        operationName: 'createOrder',
        entity: 'Order',
      })
    })

    it('maps valid Event input with trimmed eventName', () => {
      const input = {
        ...baseInput,
        componentType: 'Event',
        eventName: '  OrderCreated  ',
        eventSchema: 'OrderCreatedSchema',
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('Event')
      expect(result.input).toMatchObject({
        eventName: 'OrderCreated',
        eventSchema: 'OrderCreatedSchema',
      })
    })

    it('maps valid Custom input with trimmed customType', () => {
      const input = {
        ...baseInput,
        componentType: 'Custom',
        customType: '  MyCustomType  ',
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('Custom')
      expect(result.input).toMatchObject({ customTypeName: 'MyCustomType' })
    })

    it('maps valid Custom input with customProperty metadata', () => {
      const input = {
        ...baseInput,
        componentType: 'Custom',
        customType: 'MyType',
        customProperty: ['key:value', 'another:prop'],
      }
      const result = buildDomainInput(input)
      expect(result.type).toBe('Custom')
      expect(result.input).toMatchObject({
        customTypeName: 'MyType',
        metadata: {
          key: 'value',
          another: 'prop',
        },
      })
    })
  })

  describe('UI component', () => {
    it('throws when route is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'UI',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow('--route is required for UI component')
    })

    it('throws when route is only whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'UI',
        route: '   ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })
  })

  describe('API component', () => {
    it('throws when apiType is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'API',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow('--api-type is required for API component')
    })

    it('throws when apiType is invalid', () => {
      const input = {
        ...baseInput,
        componentType: 'API',
        apiType: 'SOAP',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow('--api-type is required for API component')
    })

    it('throws when httpMethod is invalid', () => {
      const input = {
        ...baseInput,
        componentType: 'API',
        apiType: 'REST',
        httpMethod: 'INVALID',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow('--http-method is required for API component')
    })
  })

  describe('DomainOp component', () => {
    it('throws when operationName is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'DomainOp',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow(
        '--operation-name is required for DomainOp component',
      )
    })

    it('throws when operationName is only whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'DomainOp',
        operationName: '   ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })
  })

  describe('Event component', () => {
    it('throws when eventName is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'Event',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow('--event-name is required for Event component')
    })

    it('throws when eventName is only whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'Event',
        eventName: '   ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })
  })

  describe('EventHandler component', () => {
    it('throws when subscribedEvents is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'EventHandler',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow(
        '--subscribed-events is required for EventHandler component',
      )
    })

    it('throws when subscribedEvents is empty string', () => {
      const input = {
        ...baseInput,
        componentType: 'EventHandler',
        subscribedEvents: '',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })

    it('throws when subscribedEvents is only whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'EventHandler',
        subscribedEvents: '   ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })

    it('throws when subscribedEvents is only commas and whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'EventHandler',
        subscribedEvents: ' , , ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })
  })

  describe('Custom component', () => {
    it('throws when customType is missing', () => {
      const input = {
        ...baseInput,
        componentType: 'Custom',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
      expect(() => buildDomainInput(input)).toThrow(
        '--custom-type is required for Custom component',
      )
    })

    it('throws when customType is only whitespace', () => {
      const input = {
        ...baseInput,
        componentType: 'Custom',
        customType: '   ',
      }
      expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    })

    it('throws InvalidCustomPropertyError for malformed customProperty', () => {
      const input = {
        ...baseInput,
        componentType: 'Custom',
        customType: 'MyType',
        customProperty: ['invalid-no-colon'],
      }
      expect(() => buildDomainInput(input)).toThrow(InvalidCustomPropertyError)
    })
  })
})
