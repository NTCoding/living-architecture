import {
  describe, it, expect 
} from 'vitest'
import {
  ComponentNotFoundError,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  DuplicateDomainError,
  InvalidEnrichmentTargetError,
  CustomTypeAlreadyDefinedError,
  MissingRequiredPropertiesError,
  InvalidGraphError,
  MissingSourcesError,
  MissingDomainsError,
  BuildValidationError,
} from './errors'

describe('errors', () => {
  describe('DuplicateDomainError', () => {
    it('includes domain name in message', () => {
      const error = new DuplicateDomainError('orders')

      expect(error.message).toBe("Domain 'orders' already exists")
      expect(error.domainName).toBe('orders')
      expect(error.name).toBe('DuplicateDomainError')
    })
  })

  describe('DomainNotFoundError', () => {
    it('includes domain name in message', () => {
      const error = new DomainNotFoundError('orders')

      expect(error.message).toBe("Domain 'orders' does not exist")
      expect(error.domainName).toBe('orders')
      expect(error.name).toBe('DomainNotFoundError')
    })
  })

  describe('CustomTypeNotFoundError', () => {
    it('includes custom type name and defined types in message', () => {
      const error = new CustomTypeNotFoundError('Queue', ['Worker', 'Cache'])

      expect(error.message).toBe("Custom type 'Queue' not defined. Defined types: Worker, Cache")
      expect(error.customTypeName).toBe('Queue')
      expect(error.definedTypes).toStrictEqual(['Worker', 'Cache'])
      expect(error.name).toBe('CustomTypeNotFoundError')
    })

    it('handles empty defined types', () => {
      const error = new CustomTypeNotFoundError('Queue', [])

      expect(error.message).toBe(
        "Custom type 'Queue' not defined. No custom types have been defined.",
      )
    })
  })

  describe('DuplicateComponentError', () => {
    it('includes component ID in message', () => {
      const error = new DuplicateComponentError('orders:checkout:api:create-order')

      expect(error.message).toBe(
        "Component with ID 'orders:checkout:api:create-order' already exists",
      )
      expect(error.componentId).toBe('orders:checkout:api:create-order')
      expect(error.name).toBe('DuplicateComponentError')
    })
  })

  describe('ComponentNotFoundError', () => {
    it('includes component ID and empty suggestions by default', () => {
      const error = new ComponentNotFoundError('orders:checkout:api:create-ordr')

      expect(error.message).toBe("Source component 'orders:checkout:api:create-ordr' not found")
      expect(error.componentId).toBe('orders:checkout:api:create-ordr')
      expect(error.suggestions).toStrictEqual([])
      expect(error.name).toBe('ComponentNotFoundError')
    })

    it('includes suggestions in message when provided', () => {
      const error = new ComponentNotFoundError('orders:checkout:api:create-ordr', [
        'orders:checkout:api:create-order',
        'orders:checkout:api:update-order',
      ])

      expect(error.message).toBe(
        "Source component 'orders:checkout:api:create-ordr' not found. Did you mean: orders:checkout:api:create-order, orders:checkout:api:update-order?",
      )
      expect(error.suggestions).toStrictEqual([
        'orders:checkout:api:create-order',
        'orders:checkout:api:update-order',
      ])
    })
  })

  describe('InvalidEnrichmentTargetError', () => {
    it('includes component ID and type in message', () => {
      const error = new InvalidEnrichmentTargetError('orders:api:create', 'API')

      expect(error.message).toBe(
        "Only DomainOp components can be enriched. 'orders:api:create' is type 'API'",
      )
      expect(error.componentId).toBe('orders:api:create')
      expect(error.componentType).toBe('API')
      expect(error.name).toBe('InvalidEnrichmentTargetError')
    })
  })

  describe('CustomTypeAlreadyDefinedError', () => {
    it('includes type name in message', () => {
      const error = new CustomTypeAlreadyDefinedError('Worker')

      expect(error.message).toBe("Custom type 'Worker' already defined")
      expect(error.typeName).toBe('Worker')
      expect(error.name).toBe('CustomTypeAlreadyDefinedError')
    })
  })

  describe('MissingRequiredPropertiesError', () => {
    it('includes custom type name and missing keys in message', () => {
      const error = new MissingRequiredPropertiesError('Worker', ['queueName', 'concurrency'])

      expect(error.message).toBe("Missing required properties for 'Worker': queueName, concurrency")
      expect(error.customTypeName).toBe('Worker')
      expect(error.missingKeys).toStrictEqual(['queueName', 'concurrency'])
      expect(error.name).toBe('MissingRequiredPropertiesError')
    })
  })

  describe('InvalidGraphError', () => {
    it('includes reason in message', () => {
      const error = new InvalidGraphError('missing version')

      expect(error.message).toBe('Invalid graph: missing version')
      expect(error.name).toBe('InvalidGraphError')
    })
  })

  describe('MissingSourcesError', () => {
    it('sets message', () => {
      const error = new MissingSourcesError()

      expect(error.message).toBe('At least one source required')
      expect(error.name).toBe('MissingSourcesError')
    })
  })

  describe('MissingDomainsError', () => {
    it('sets message', () => {
      const error = new MissingDomainsError()

      expect(error.message).toBe('At least one domain required')
      expect(error.name).toBe('MissingDomainsError')
    })
  })

  describe('BuildValidationError', () => {
    it('includes validation messages in message', () => {
      const error = new BuildValidationError(['error 1', 'error 2'])

      expect(error.message).toBe('Validation failed: error 1; error 2')
      expect(error.validationMessages).toStrictEqual(['error 1', 'error 2'])
      expect(error.name).toBe('BuildValidationError')
    })
  })
})
