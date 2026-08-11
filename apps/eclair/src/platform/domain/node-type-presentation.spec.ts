import {
  // Keep expanded for ESLint.
  describe,
  expect,
  it,
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  getEffectiveNodeType,
  getNodeTypeColor,
  getNodeTypeDescription,
  getNodeTypesInGraph,
} from './node-type-presentation'
import { TestAssertionError } from '@/test-assertions'

const graph: RiviereGraph = {
  version: '1.0',
  metadata: {
    domains: {
      orders: {
        description: 'Orders',
        systemType: 'other',
      },
    },
    customTypes: {
      Job: { description: 'A scheduled unit of work' },
      Table: { description: 'Stored data' },
    },
  },
  components: [
    {
      id: 'job-1',
      type: 'Custom',
      customTypeName: 'Job',
      name: 'Import orders',
      domain: 'orders',
      module: 'agent',
      sourceLocation: { filePath: 'jobs.csv' },
    },
    {
      id: 'table-1',
      type: 'Custom',
      customTypeName: 'Table',
      name: 'Orders',
      domain: 'orders',
      module: 'database',
      sourceLocation: { filePath: 'orders.sql' },
    },
    {
      id: 'api-1',
      type: 'API',
      name: 'Orders API',
      domain: 'orders',
      module: 'api',
      path: '/orders',
      sourceLocation: { filePath: 'api.ts' },
    },
  ],
  links: [],
}

function componentById(id: string): RiviereGraph['components'][number] {
  const component = graph.components.find((candidate) => candidate.id === id)
  if (component === undefined) throw new TestAssertionError(`Missing test component: ${id}`)
  return component
}

describe('node type presentation', () => {
  it('uses a declared custom type as the effective type', () => {
    expect(getEffectiveNodeType(componentById('job-1'))).toBe('Job')
    expect(getEffectiveNodeType(componentById('api-1'))).toBe('API')
  })

  it('returns the sorted effective types present in the graph', () => {
    expect(getNodeTypesInGraph(graph)).toStrictEqual(['API', 'Job', 'Table'])
    expect(getNodeTypesInGraph(graph, true)).toStrictEqual(['API', 'Job', 'Table'])
  })

  it('includes External only when requested and present', () => {
    const graphWithExternal: RiviereGraph = {
      ...graph,
      externalLinks: [
        {
          source: 'api-1',
          target: { name: 'Payments' },
        },
      ],
    }
    expect(getNodeTypesInGraph(graphWithExternal, true)).toStrictEqual([
      'API',
      'External',
      'Job',
      'Table',
    ])
  })

  it('returns graph-defined custom type descriptions', () => {
    expect(getNodeTypeDescription(graph, 'Job')).toBe('A scheduled unit of work')
    expect(getNodeTypeDescription(graph, 'API')).toBeUndefined()
  })

  it('maps built-in and custom types deterministically in every theme', () => {
    expect(getNodeTypeColor('API', 'stream')).toBe('#0D9488')
    expect(getNodeTypeColor('Job', 'stream')).toBe(getNodeTypeColor('Job', 'stream'))
    expect(getNodeTypeColor('Job', 'voltage')).not.toBe(getNodeTypeColor('Job', 'stream'))
  })
})
