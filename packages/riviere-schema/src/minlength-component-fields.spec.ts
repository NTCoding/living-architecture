import {
  parseRiviereGraph, RiviereSchemaValidationError 
} from './validation'

describe('minLength validation: component fields', () => {
  const baseGraph = {
    version: '1.0',
    metadata: {
      domains: {
        test: {
          description: 'Test domain',
          systemType: 'domain' as const,
        },
      },
    },
    components: [],
    links: [],
  }

  describe('apiRestComponent.path', () => {
    it('rejects empty path', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:endpoint',
            type: 'API',
            name: 'Endpoint',
            domain: 'test',
            module: 'mod',
            apiType: 'REST',
            httpMethod: 'GET',
            path: '',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/path/)
    })

    it('rejects path with length < 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:endpoint',
            type: 'API',
            name: 'Endpoint',
            domain: 'test',
            module: 'mod',
            apiType: 'REST',
            httpMethod: 'GET',
            path: '/a',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/path/)
    })

    it('accepts path with length >= 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:endpoint',
            type: 'API',
            name: 'Endpoint',
            domain: 'test',
            module: 'mod',
            apiType: 'REST',
            httpMethod: 'GET',
            path: '/ab',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })

  describe('apiGraphqlComponent.operationName', () => {
    it('rejects empty operationName', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:query',
            type: 'API',
            name: 'Query',
            domain: 'test',
            module: 'mod',
            apiType: 'GraphQL',
            operationName: '',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/operationName/)
    })

    it('rejects operationName with length < 2', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:query',
            type: 'API',
            name: 'Query',
            domain: 'test',
            module: 'mod',
            apiType: 'GraphQL',
            operationName: 'a',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/operationName/)
    })

    it('accepts operationName with length >= 2', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:api:query',
            type: 'API',
            name: 'Query',
            domain: 'test',
            module: 'mod',
            apiType: 'GraphQL',
            operationName: 'ab',
            sourceLocation: {
              repository: 'repo',
              filePath: 'api.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })

  describe('domainOpComponent.operationName', () => {
    it('rejects empty operationName', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:op:action',
            type: 'DomainOp',
            name: 'Action',
            domain: 'test',
            module: 'mod',
            operationName: '',
            sourceLocation: {
              repository: 'repo',
              filePath: 'domain.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/operationName/)
    })

    it('rejects operationName with length < 2', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:op:action',
            type: 'DomainOp',
            name: 'Action',
            domain: 'test',
            module: 'mod',
            operationName: 'a',
            sourceLocation: {
              repository: 'repo',
              filePath: 'domain.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/operationName/)
    })

    it('accepts operationName with length >= 2', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:op:action',
            type: 'DomainOp',
            name: 'Action',
            domain: 'test',
            module: 'mod',
            operationName: 'ab',
            sourceLocation: {
              repository: 'repo',
              filePath: 'domain.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })

  describe('eventComponent.eventName', () => {
    it('rejects empty eventName', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:event:created',
            type: 'Event',
            name: 'Created',
            domain: 'test',
            module: 'mod',
            eventName: '',
            sourceLocation: {
              repository: 'repo',
              filePath: 'events.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/eventName/)
    })

    it('rejects eventName with length < 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:event:created',
            type: 'Event',
            name: 'Created',
            domain: 'test',
            module: 'mod',
            eventName: 'ab',
            sourceLocation: {
              repository: 'repo',
              filePath: 'events.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/eventName/)
    })

    it('accepts eventName with length >= 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:event:created',
            type: 'Event',
            name: 'Created',
            domain: 'test',
            module: 'mod',
            eventName: 'abc',
            sourceLocation: {
              repository: 'repo',
              filePath: 'events.ts',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })
})
