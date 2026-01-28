import {
  describe, expect, it 
} from 'vitest'
import { filterByNodeType } from './filterByNodeType'
import type {
  Node, Edge 
} from '@/types/riviere'
import {
  parseNode, parseEdge 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('filterByNodeType', () => {
  it('keeps nodes of visible types', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
      parseEdge({
        source: '2',
        target: '3',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'UseCase']))

    expect(result.nodes).toHaveLength(2)
    expect(result.nodes.map((n) => n.id)).toStrictEqual(['1', '2'])
  })

  it('removes nodes of hidden types', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API']))

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.id).toBe('1')
  })

  it('keeps edges when both endpoints are visible', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'UseCase']))

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]?.source).toBe('1')
    expect(result.edges[0]?.target).toBe('2')
  })

  it('rewires edges when middle node is hidden', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
      parseEdge({
        source: '2',
        target: '3',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'DomainOp']))

    expect(result.nodes.map((n) => n.id)).toStrictEqual(['1', '3'])
    expect(result.edges).toStrictEqual([
      expect.objectContaining({
        source: '1',
        target: '3',
      }),
    ])
  })

  it('rewires edges through multiple hidden nodes', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'UseCase',
        name: 'UseCase 2',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '4',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
      parseEdge({
        source: '2',
        target: '3',
      }),
      parseEdge({
        source: '3',
        target: '4',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'DomainOp']))

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]?.source).toBe('1')
    expect(result.edges[0]?.target).toBe('4')
  })

  it('preserves edge metadata when rewiring', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
        type: 'sync',
      }),
      parseEdge({
        source: '2',
        target: '3',
        type: 'async',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'DomainOp']))

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]?.type).toBe('async')
  })

  it('handles multiple paths from same source to same target', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'UseCase',
        name: 'UseCase 2',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '4',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
      parseEdge({
        source: '1',
        target: '3',
      }),
      parseEdge({
        source: '2',
        target: '4',
      }),
      parseEdge({
        source: '3',
        target: '4',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'DomainOp']))

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]?.source).toBe('1')
    expect(result.edges[0]?.target).toBe('4')
  })

  it('returns empty graph when all types are hidden', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set())

    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('handles disconnected nodes', () => {
    const nodes: Node[] = [
      parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'API 1',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '2',
        type: 'UseCase',
        name: 'UseCase 1',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: '3',
        type: 'DomainOp',
        name: 'DomainOp 1',
        domain: 'orders',
        module: 'core',
        operationName: 'op1',
      }),
    ]
    const edges: Edge[] = [
      parseEdge({
        source: '1',
        target: '2',
      }),
    ]

    const result = filterByNodeType(nodes, edges, new Set(['API', 'DomainOp']))

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(0)
  })
})
