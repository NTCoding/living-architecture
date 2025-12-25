import { describe, it, expect } from 'vitest'
import { extractEntities } from './domainNodeBreakdown'
import { parseNode } from '@/lib/riviereTestData'
import type { SourceLocation } from '@/types/riviere'
import type { RawNode } from '@/lib/riviereTestData'

const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  return parseNode({
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: 'API',
    apiType: 'other',
    name: 'Test Node',
    domain: 'test-domain',
    module: 'test-module',
    ...overrides,
  })
}

describe('extractEntities', () => {
  it('groups DomainOp nodes by entity name', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
      }),
      createNode({
        id: 'op-2',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'complete',
        name: 'Order.complete',
      }),
    ]

    const result = extractEntities(nodes)

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Order')
    expect(result[0]?.operations).toContain('begin')
    expect(result[0]?.operations).toContain('complete')
  })

  it('collects operation details for each entity', () => {
    const sourceLocation: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 20 }
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
        sourceLocation,
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.operationDetails).toHaveLength(1)
    expect(result[0]?.operationDetails[0]).toEqual({
      id: 'op-1',
      operationName: 'begin',
      name: 'Order.begin',
      behavior: undefined,
      stateChanges: undefined,
      signature: undefined,
      sourceLocation,
    })
  })

  it('sorts entities alphabetically', () => {
    const nodes = [
      createNode({ id: 'op-1', type: 'DomainOp', entity: 'Zebra', operationName: 'op1', name: 'Z' }),
      createNode({ id: 'op-2', type: 'DomainOp', entity: 'Apple', operationName: 'op1', name: 'A' }),
      createNode({ id: 'op-3', type: 'DomainOp', entity: 'Monkey', operationName: 'op1', name: 'M' }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.name).toBe('Apple')
    expect(result[1]?.name).toBe('Monkey')
    expect(result[2]?.name).toBe('Zebra')
  })

  it('sorts operations alphabetically within each entity', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'zebra',
        name: 'Z',
      }),
      createNode({
        id: 'op-2',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'apple',
        name: 'A',
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.operationDetails[0]?.operationName).toBe('apple')
    expect(result[0]?.operationDetails[1]?.operationName).toBe('zebra')
  })

  it('uses first encountered sourceLocation as entity sourceLocation', () => {
    const loc1: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 20 }
    const loc2: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 40 }
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
        sourceLocation: loc1,
      }),
      createNode({
        id: 'op-2',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'complete',
        name: 'Order.complete',
        sourceLocation: loc2,
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.sourceLocation).toBe(loc1)
  })

  it('returns empty array when no DomainOp nodes', () => {
    const nodes = [
      createNode({ id: 'api-1', type: 'API' }),
      createNode({ id: 'uc-1', type: 'UseCase' }),
    ]

    const result = extractEntities(nodes)

    expect(result).toEqual([])
  })

  it('ignores non-DomainOp nodes', () => {
    const nodes = [
      createNode({ id: 'api-1', type: 'API', entity: 'Order' }),
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
      }),
    ]

    const result = extractEntities(nodes)

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Order')
  })

  it('skips DomainOp nodes without entity for entity extraction', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        operationName: 'begin',
        name: 'Something.begin',
      }),
    ]

    const result = extractEntities(nodes)

    expect(result).toEqual([])
  })

  it('extracts DomainOp nodes with entity and operationName', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'process',
        name: 'Order.process',
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.name).toBe('Order')
    expect(result[0]?.operations).toEqual(['process'])
  })

  it('collects all states from state changes', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
        stateChanges: [{ from: 'initial', to: 'pending' }],
      }),
      createNode({
        id: 'op-2',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'complete',
        name: 'Order.complete',
        stateChanges: [{ from: 'pending', to: 'completed' }],
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.allStates).toContain('initial')
    expect(result[0]?.allStates).toContain('pending')
    expect(result[0]?.allStates).toContain('completed')
  })

  it('orders states by following transition chains from initial states', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'begin',
        name: 'Order.begin',
        stateChanges: [{ from: 'initial', to: 'pending' }],
      }),
      createNode({
        id: 'op-2',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'complete',
        name: 'Order.complete',
        stateChanges: [{ from: 'pending', to: 'completed' }],
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.allStates).toEqual(['initial', 'pending', 'completed'])
  })

  it('handles circular state transitions', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'retry',
        name: 'Order.retry',
        stateChanges: [
          { from: 'initial', to: 'pending' },
          { from: 'pending', to: 'failed' },
          { from: 'failed', to: 'pending' },
        ],
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.allStates).toContain('initial')
    expect(result[0]?.allStates).toContain('pending')
    expect(result[0]?.allStates).toContain('failed')
  })

  it('handles disconnected state transitions', () => {
    const nodes = [
      createNode({
        id: 'op-1',
        type: 'DomainOp',
        entity: 'Order',
        operationName: 'transition',
        name: 'Order.transition',
        stateChanges: [
          { from: 'initial', to: 'pending' },
          { from: 'archived', to: 'deleted' },
        ],
      }),
    ]

    const result = extractEntities(nodes)

    expect(result[0]?.allStates).toHaveLength(4)
    const entity = result[0]
    if (entity === undefined) {
      throw new Error('Expected entity to exist')
    }
    expect(entity.allStates[0]).toBe('initial')
    expect(entity.allStates[1]).toBe('pending')
    expect(entity.allStates).toContain('archived')
    expect(entity.allStates).toContain('deleted')
  })
})
