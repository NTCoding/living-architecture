import { parseRiviereGraph } from './published-language/validation'

function expectInvalid(input: unknown, fieldName: string): void {
  const result = parseRiviereGraph(input)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.issues.join('\n')).toContain(fieldName)
  }
}

function expectValid(input: unknown): void {
  expect(parseRiviereGraph(input).success).toBe(true)
}

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
      expectInvalid(input, 'path')
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
      expectInvalid(input, 'path')
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
      expectValid(input)
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
      expectInvalid(input, 'operationName')
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
      expectInvalid(input, 'operationName')
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
      expectValid(input)
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
      expectInvalid(input, 'operationName')
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
      expectInvalid(input, 'operationName')
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
      expectValid(input)
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
      expectInvalid(input, 'eventName')
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
      expectInvalid(input, 'eventName')
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
      expectValid(input)
    })
  })
})
