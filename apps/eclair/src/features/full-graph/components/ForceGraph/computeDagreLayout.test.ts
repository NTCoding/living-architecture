import {
 describe, it, expect 
} from 'vitest'
import { computeDagreLayout } from './computeDagreLayout'
import type { SimulationNode } from '../../types'
import { parseNode } from '@/lib/riviereTestData'

const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

function getTypeSpecificFields(type: SimulationNode['type']): Record<string, unknown> {
  if (type === 'Event') return { eventName: 'TestEvent' }
  if (type === 'UI') return { route: '/test' }
  if (type === 'DomainOp') return { operationName: 'testOperation' }
  if (type === 'EventHandler') return { subscribedEvents: ['TestEvent'] }
  if (type === 'Custom') return { customTypeName: 'TestCustom' }
  return {}
}

function createTestNode(overrides: Partial<SimulationNode> & {
 id: string;
type: SimulationNode['type'] 
}): SimulationNode {
  return {
    id: overrides.id,
    type: overrides.type,
    name: overrides.name ?? `node-${overrides.id}`,
    domain: overrides.domain ?? 'test-domain',
    originalNode: parseNode({
      id: overrides.id,
      type: overrides.type,
      name: overrides.name ?? `node-${overrides.id}`,
      domain: overrides.domain ?? 'test-domain',
      module: 'test-module',
      sourceLocation: testSourceLocation,
      ...getTypeSpecificFields(overrides.type),
    }),
    ...overrides,
  }
}

describe('computeDagreLayout', () => {
  it('returns positions for all nodes', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'api-1',
type: 'API' 
}),
      createTestNode({
 id: 'usecase-1',
type: 'UseCase' 
}),
    ]
    const edges = [{
 source: 'api-1',
target: 'usecase-1' 
}]

    const result = computeDagreLayout({
 nodes,
edges 
})

    expect(result.size).toBe(2)
    expect(result.has('api-1')).toBe(true)
    expect(result.has('usecase-1')).toBe(true)
  })

  it('assigns numeric x and y coordinates to each node', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'node-1',
type: 'API' 
}),
      createTestNode({
 id: 'node-2',
type: 'UseCase' 
}),
    ]
    const edges = [{
 source: 'node-1',
target: 'node-2' 
}]

    const result = computeDagreLayout({
 nodes,
edges 
})

    const pos1 = result.get('node-1')
    const pos2 = result.get('node-2')

    expect(pos1).toBeDefined()
    expect(pos2).toBeDefined()
    if (pos1 && pos2) {
      expect(typeof pos1.x).toBe('number')
      expect(typeof pos1.y).toBe('number')
      expect(typeof pos2.x).toBe('number')
      expect(typeof pos2.y).toBe('number')
    }
  })

  it('handles empty input', () => {
    const result = computeDagreLayout({
 nodes: [],
edges: [] 
})

    expect(result.size).toBe(0)
  })

  it('handles nodes with no edges', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'isolated-1',
type: 'API' 
}),
      createTestNode({
 id: 'isolated-2',
type: 'Event' 
}),
    ]

    const result = computeDagreLayout({
 nodes,
edges: [] 
})

    expect(result.size).toBe(2)
    expect(result.get('isolated-1')).toBeDefined()
    expect(result.get('isolated-2')).toBeDefined()
  })

  it('applies left-to-right layout direction', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'source',
type: 'API' 
}),
      createTestNode({
 id: 'target',
type: 'UseCase' 
}),
    ]
    const edges = [{
 source: 'source',
target: 'target' 
}]

    const result = computeDagreLayout({
 nodes,
edges 
})

    const sourcePos = result.get('source')
    const targetPos = result.get('target')

    expect(sourcePos).toBeDefined()
    expect(targetPos).toBeDefined()
    if (sourcePos && targetPos) {
      expect(sourcePos.x).toBeLessThan(targetPos.x)
    }
  })

  it('handles different node types with different radii', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'ui',
type: 'UI' 
}),
      createTestNode({
 id: 'api',
type: 'API' 
}),
      createTestNode({
 id: 'usecase',
type: 'UseCase' 
}),
      createTestNode({
 id: 'domainop',
type: 'DomainOp' 
}),
      createTestNode({
 id: 'event',
type: 'Event' 
}),
    ]
    const edges = [
      {
 source: 'ui',
target: 'api' 
},
      {
 source: 'api',
target: 'usecase' 
},
      {
 source: 'usecase',
target: 'domainop' 
},
      {
 source: 'domainop',
target: 'event' 
},
    ]

    const result = computeDagreLayout({
 nodes,
edges 
})

    expect(result.size).toBe(5)
    for (const node of nodes) {
      const pos = result.get(node.id)
      expect(pos).toBeDefined()
      if (pos) {
        expect(Number.isFinite(pos.x)).toBe(true)
        expect(Number.isFinite(pos.y)).toBe(true)
      }
    }
  })

  it('handles multiple connected components', () => {
    const nodes: SimulationNode[] = [
      createTestNode({
 id: 'a1',
type: 'API' 
}),
      createTestNode({
 id: 'a2',
type: 'UseCase' 
}),
      createTestNode({
 id: 'b1',
type: 'API' 
}),
      createTestNode({
 id: 'b2',
type: 'UseCase' 
}),
    ]
    const edges = [
      {
 source: 'a1',
target: 'a2' 
},
      {
 source: 'b1',
target: 'b2' 
},
    ]

    const result = computeDagreLayout({
 nodes,
edges 
})

    expect(result.size).toBe(4)
  })
})
