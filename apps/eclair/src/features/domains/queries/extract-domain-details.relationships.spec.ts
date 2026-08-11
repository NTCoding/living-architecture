import { describe, expect, it } from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseDomainKey,
  parseDomainMetadata,
  parseEdge,
  parseNode,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { extractDomainDetails } from './extract-domain-details'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const components: RiviereGraph['components'] = [
  parseNode({
    id: 'source-api',
    type: 'API',
    name: 'Source API',
    domain: 'source-domain',
    module: 'api',
    sourceLocation,
  }),
  parseNode({
    id: 'target-api',
    type: 'API',
    name: 'Target API',
    domain: 'target-domain',
    module: 'api',
    sourceLocation,
  }),
]

function createGraph(links: RiviereGraph['links']): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Graph',
      domains: parseDomainMetadata({
        'source-domain': {
          description: 'Source',
          systemType: 'domain',
        },
        'target-domain': {
          description: 'Target',
          systemType: 'domain',
        },
      }),
    },
    components,
    links,
  }
}

describe('extractDomainDetails relationship metadata', () => {
  it('keeps literal fallback values and colon-containing conditions distinct', () => {
    const graph = createGraph([
      parseEdge({
        source: 'source-api',
        target: 'target-api',
      }),
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'relationship',
        condition: 'unconditional',
      }),
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'calls',
        condition: 'status:ready',
      }),
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'calls',
        condition: 'status:blocked',
      }),
    ])

    const result = extractDomainDetails(graph, parseDomainKey('source-domain'))

    expect(result?.crossDomainEdges).toHaveLength(4)
    expect(result?.crossDomainEdges).toContainEqual({
      targetDomain: 'target-domain',
      edgeType: undefined,
    })
    expect(result?.crossDomainEdges).toContainEqual({
      targetDomain: 'target-domain',
      edgeType: undefined,
      relationshipType: 'relationship',
      condition: 'unconditional',
    })
    expect(result?.crossDomainEdges.map((edge) => edge.condition)).toStrictEqual(
      expect.arrayContaining(['status:ready', 'status:blocked']),
    )
  })

  it('collects distinct conditions for aggregated domain connections', () => {
    const graph = createGraph([
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'calls',
        condition: 'status:ready',
      }),
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'calls',
        condition: 'status:blocked',
      }),
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        relationshipType: 'calls',
        condition: 'status:ready',
      }),
    ])

    const result = extractDomainDetails(graph, parseDomainKey('source-domain'))

    expect(result?.aggregatedConnections).toContainEqual(
      expect.objectContaining({
        targetDomain: 'target-domain',
        conditions: ['status:ready', 'status:blocked'],
      }),
    )
  })

  it('collects delivery types from unnamed relationships', () => {
    const graph = createGraph([
      parseEdge({
        source: 'source-api',
        target: 'target-api',
        type: 'sync',
      }),
    ])

    const result = extractDomainDetails(graph, parseDomainKey('source-domain'))

    expect(result?.aggregatedConnections).toContainEqual({
      targetDomain: 'target-domain',
      direction: 'outgoing',
      apiCount: 1,
      eventCount: 0,
      relationshipCount: 1,
      deliveryTypes: ['sync'],
    })
  })
})
