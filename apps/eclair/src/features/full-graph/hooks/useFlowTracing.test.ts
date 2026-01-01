import { describe, expect, test } from 'vitest'
import { traceFlow } from './useFlowTracing'
import type { Edge } from '@/types/riviere'
import { parseEdge } from '@/lib/riviereTestData'

const testEdges: Edge[] = [
  parseEdge({ source: 'a', target: 'b', type: 'sync' }),
  parseEdge({ source: 'b', target: 'c', type: 'sync' }),
  parseEdge({ source: 'c', target: 'd', type: 'async' }),
  parseEdge({ source: 'a', target: 'e', type: 'sync' }),
  parseEdge({ source: 'f', target: 'a', type: 'sync' }),
  parseEdge({ source: 'g', target: 'h', type: 'sync' }),
]

describe('traceFlow', () => {
  test('returns starting node when no connections exist', () => {
    const result = traceFlow('z', testEdges)

    expect(result.nodeIds).toEqual(new Set(['z']))
    expect(result.edgeKeys).toEqual(new Set())
  })

  test('traces forward through outgoing edges', () => {
    const result = traceFlow('b', testEdges)

    expect(result.nodeIds).toContain('b')
    expect(result.nodeIds).toContain('c')
    expect(result.nodeIds).toContain('d')
  })

  test('traces backward through incoming edges', () => {
    const result = traceFlow('b', testEdges)

    expect(result.nodeIds).toContain('a')
    expect(result.nodeIds).toContain('f')
  })

  test('includes edges from the traced flow', () => {
    const result = traceFlow('b', testEdges)

    expect(result.edgeKeys).toContain('a->b')
    expect(result.edgeKeys).toContain('b->c')
    expect(result.edgeKeys).toContain('c->d')
    expect(result.edgeKeys).toContain('f->a')
  })

  test('does not include unrelated nodes', () => {
    const result = traceFlow('b', testEdges)

    expect(result.nodeIds).not.toContain('g')
    expect(result.nodeIds).not.toContain('h')
  })

  test('does not include unrelated edges', () => {
    const result = traceFlow('b', testEdges)

    expect(result.edgeKeys).not.toContain('g->h')
  })

  test('traces complete bidirectional flow from middle node', () => {
    const result = traceFlow('c', testEdges)

    expect(result.nodeIds).toEqual(new Set(['a', 'b', 'c', 'd', 'e', 'f']))
  })

  test('handles cyclic graphs without infinite loops', () => {
    const cyclicEdges: Edge[] = [
      parseEdge({ source: 'x', target: 'y' }),
      parseEdge({ source: 'y', target: 'z' }),
      parseEdge({ source: 'z', target: 'x' }),
    ]

    const result = traceFlow('x', cyclicEdges)

    expect(result.nodeIds).toEqual(new Set(['x', 'y', 'z']))
    expect(result.edgeKeys.size).toBe(3)
  })

  test('handles empty edge list', () => {
    const result = traceFlow('a', [])

    expect(result.nodeIds).toEqual(new Set(['a']))
    expect(result.edgeKeys).toEqual(new Set())
  })

  test('traces from leaf node back to root', () => {
    const result = traceFlow('d', testEdges)

    expect(result.nodeIds).toContain('a')
    expect(result.nodeIds).toContain('b')
    expect(result.nodeIds).toContain('c')
    expect(result.nodeIds).toContain('d')
  })

  test('traces flow from external node back through connected internal nodes', () => {
    const edgesWithExternal: Edge[] = [
      parseEdge({ source: 'api', target: 'usecase', type: 'sync' }),
      parseEdge({ source: 'usecase', target: 'external:Stripe', type: 'sync' }),
    ]

    const result = traceFlow('external:Stripe', edgesWithExternal)

    expect(result.nodeIds).toContain('external:Stripe')
    expect(result.nodeIds).toContain('usecase')
    expect(result.nodeIds).toContain('api')
    expect(result.edgeKeys).toContain('usecase->external:Stripe')
    expect(result.edgeKeys).toContain('api->usecase')
  })
})
