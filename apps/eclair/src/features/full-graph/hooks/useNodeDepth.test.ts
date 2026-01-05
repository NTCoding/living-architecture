import {
  describe, expect, test 
} from 'vitest'
import { calculateNodeDepths } from './useNodeDepth'

interface TestEdge {
  source: string
  target: string
}

describe('calculateNodeDepths', () => {
  test('returns depth 0 for nodes with no incoming edges', () => {
    const nodeIds = ['A', 'B']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
  })

  test('returns depth 1 for nodes one step from entry point', () => {
    const nodeIds = ['A', 'B']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('B')).toBe(1)
  })

  test('returns correct depths for linear chain', () => {
    const nodeIds = ['A', 'B', 'C', 'D']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
      {
        source: 'B',
        target: 'C',
      },
      {
        source: 'C',
        target: 'D',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
    expect(depths.get('B')).toBe(1)
    expect(depths.get('C')).toBe(2)
    expect(depths.get('D')).toBe(3)
  })

  test('uses max depth when node has multiple incoming paths', () => {
    const nodeIds = ['A', 'B', 'C', 'D']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
      {
        source: 'A',
        target: 'C',
      },
      {
        source: 'B',
        target: 'D',
      },
      {
        source: 'C',
        target: 'D',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
    expect(depths.get('B')).toBe(1)
    expect(depths.get('C')).toBe(1)
    expect(depths.get('D')).toBe(2)
  })

  test('handles multiple entry points (no incoming edges)', () => {
    const nodeIds = ['A', 'B', 'C']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'C',
      },
      {
        source: 'B',
        target: 'C',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
    expect(depths.get('B')).toBe(0)
    expect(depths.get('C')).toBe(1)
  })

  test('handles cycles without infinite loop', () => {
    const nodeIds = ['A', 'B', 'C']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
      {
        source: 'B',
        target: 'C',
      },
      {
        source: 'C',
        target: 'A',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBeGreaterThanOrEqual(0)
    expect(depths.get('B')).toBeGreaterThanOrEqual(0)
    expect(depths.get('C')).toBeGreaterThanOrEqual(0)
  })

  test('handles isolated nodes (no edges)', () => {
    const nodeIds = ['A', 'B']
    const edges: TestEdge[] = []

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
    expect(depths.get('B')).toBe(0)
  })

  test('handles empty graph', () => {
    const nodeIds: string[] = []
    const edges: TestEdge[] = []

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.size).toBe(0)
  })

  test('handles diamond pattern with correct max depth', () => {
    const nodeIds = ['A', 'B', 'C', 'D', 'E']
    const edges: TestEdge[] = [
      {
        source: 'A',
        target: 'B',
      },
      {
        source: 'A',
        target: 'C',
      },
      {
        source: 'B',
        target: 'D',
      },
      {
        source: 'C',
        target: 'D',
      },
      {
        source: 'D',
        target: 'E',
      },
    ]

    const depths = calculateNodeDepths(nodeIds, edges)

    expect(depths.get('A')).toBe(0)
    expect(depths.get('B')).toBe(1)
    expect(depths.get('C')).toBe(1)
    expect(depths.get('D')).toBe(2)
    expect(depths.get('E')).toBe(3)
  })
})
