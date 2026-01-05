import {
  describe, it, expect 
} from 'vitest'
import { extractFlows } from './extractFlows'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestFixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ui-1',
        type: 'UI',
        name: 'Place Order Form',
        domain: 'checkout',
        module: 'ui',
        route: '/checkout',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'do-1',
        type: 'DomainOp',
        name: 'Order.begin',
        domain: 'orders',
        module: 'order',
        operationName: 'begin',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'evt-1',
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'eh-1',
        type: 'EventHandler',
        name: 'Reserve Inventory',
        domain: 'inventory',
        module: 'handlers',
        subscribedEvents: ['OrderPlaced'],
      }),
    ],
    links: [
      parseEdge({
        source: 'ui-1',
        target: 'api-1',
        type: 'sync',
      }),
      parseEdge({
        source: 'api-1',
        target: 'uc-1',
        type: 'sync',
      }),
      parseEdge({
        source: 'uc-1',
        target: 'do-1',
        type: 'sync',
      }),
      parseEdge({
        source: 'do-1',
        target: 'evt-1',
        type: 'async',
      }),
      parseEdge({
        source: 'evt-1',
        target: 'eh-1',
        type: 'async',
      }),
    ],
  }
}

describe('extractFlows', () => {
  it('returns one flow per entry point', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)

    expect(flows).toHaveLength(1)
  })

  it('includes entry point data in each flow', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)

    expect(flows[0]?.entryPoint.id).toBe('ui-1')
    expect(flows[0]?.entryPoint.name).toBe('Place Order Form')
    expect(flows[0]?.entryPoint.type).toBe('UI')
  })

  it('includes traced steps in each flow', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)

    expect(flows[0]?.steps).toHaveLength(6)
  })

  it('returns multiple flows for multiple entry points', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'ui-1',
          type: 'UI',
          name: 'Form A',
          domain: 'd',
          module: 'm',
          route: '/form-a',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'api-1',
          type: 'API',
          name: 'GET /items',
          domain: 'd',
          module: 'm',
          apiType: 'REST',
          httpMethod: 'GET',
          path: '/items',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'uc-1',
          type: 'UseCase',
          name: 'UC',
          domain: 'd',
          module: 'm',
        }),
      ],
      links: [
        parseEdge({
          source: 'ui-1',
          target: 'uc-1',
          type: 'sync',
        }),
      ],
    }

    const flows = extractFlows(graph)

    expect(flows).toHaveLength(2)
  })

  it('includes Custom nodes as entry points', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'job-1',
          type: 'Custom',
          name: 'Daily Report',
          domain: 'reporting',
          module: 'jobs',
          customTypeName: 'ScheduledJob',
        }),
      ],
      links: [],
    }

    const flows = extractFlows(graph)

    expect(flows).toHaveLength(1)
    expect(flows[0]?.entryPoint.type).toBe('Custom')
  })

  it('preserves httpMethod and path for API entry points', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'api-1',
          type: 'API',
          name: 'Create Order',
          domain: 'orders',
          module: 'api',
          apiType: 'REST',
          httpMethod: 'POST',
          path: '/orders',
        }),
      ],
      links: [],
    }

    const flows = extractFlows(graph)

    expect(flows[0]?.entryPoint.httpMethod).toBe('POST')
    expect(flows[0]?.entryPoint.path).toBe('/orders')
  })

  it('steps include correct edge types', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const steps = flows[0]?.steps

    expect(steps?.[0]?.edgeType).toBe('sync')
    expect(steps?.[3]?.edgeType).toBe('async')
  })

  it('last step has null edgeType', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const steps = flows[0]?.steps
    const lastStep = steps?.[steps.length - 1]

    expect(lastStep?.edgeType).toBeNull()
  })

  it('steps include correct depth values', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const steps = flows[0]?.steps

    expect(steps?.[0]?.depth).toBe(0)
    expect(steps?.[1]?.depth).toBe(1)
    expect(steps?.[2]?.depth).toBe(2)
  })

  it('steps include external links from connected components', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'api-1',
          type: 'API',
          name: 'Create Order',
          domain: 'orders',
          module: 'api',
          apiType: 'REST',
          httpMethod: 'POST',
          path: '/orders',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'uc-1',
          type: 'UseCase',
          name: 'Place Order',
          domain: 'orders',
          module: 'checkout',
        }),
      ],
      links: [
        parseEdge({
          source: 'api-1',
          target: 'uc-1',
          type: 'sync',
        }),
      ],
      externalLinks: [
        {
          source: 'uc-1',
          target: {
            name: 'Stripe',
            url: 'https://stripe.com',
          },
          type: 'sync',
        },
      ],
    }

    const flows = extractFlows(graph)
    const useCaseStep = flows[0]?.steps.find((s) => s.node.id === 'uc-1')

    expect(useCaseStep?.externalLinks).toHaveLength(1)
    expect(useCaseStep?.externalLinks[0]?.target.name).toBe('Stripe')
  })

  it('steps include empty external links array when no external connections', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const firstStep = flows[0]?.steps[0]

    expect(firstStep?.externalLinks).toEqual([])
  })

  it('EventHandler steps include subscribedEvents', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const eventHandlerStep = flows[0]?.steps.find((s) => s.node.type === 'EventHandler')

    expect(eventHandlerStep?.node.subscribedEvents).toEqual(['OrderPlaced'])
  })

  it('non-EventHandler steps do not include subscribedEvents', () => {
    const graph = createTestGraph()

    const flows = extractFlows(graph)
    const useCaseStep = flows[0]?.steps.find((s) => s.node.type === 'UseCase')

    expect(useCaseStep?.node.subscribedEvents).toBeUndefined()
  })
})
