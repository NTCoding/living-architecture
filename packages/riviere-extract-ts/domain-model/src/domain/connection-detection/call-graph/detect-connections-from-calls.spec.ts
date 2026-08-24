import { describe, expect, it } from 'vitest'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { CallSite } from './call-graph-types'
import { CallableReference } from './callable-reference'
import { detectConnectionsFromCalls } from './detect-connections-from-calls'
import {
  ComponentCallable,
  ScopedCallGraph,
  ScopedCallGraphEdge,
  UnresolvedScopedCall,
} from './scoped-call-graph'

function component(name: string): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    location: { file: `/src/${name}.ts`, line: 1 },
    domain: 'orders',
    module: 'orders',
    metadata: {},
    _missing: undefined,
  })
}

function callable(name: string): CallableReference {
  return CallableReference.parse({
    kind: 'method',
    filePath: `/src/${name}.ts`,
    lineNumber: 1,
    callableName: 'execute',
    containerTypeName: name,
  })
}

function callSite(lineNumber: number, filePath = '/src/source.ts'): CallSite {
  return CallSite.parse({ filePath, lineNumber, methodName: 'execute' })
}

describe('detectConnectionsFromCalls', () => {
  it('does not connect a component to itself', () => {
    const source = component('Source')
    const sourceCallable = callable('Source')
    const graph = ScopedCallGraph.parse({
      roots: [ComponentCallable.parse({ component: source, callable: sourceCallable })],
      edges: [
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: sourceCallable,
          targetComponent: source,
          callSite: callSite(2),
        }),
      ],
      unresolvedCalls: [],
    })

    expect(detectConnectionsFromCalls(graph, 'shop')).toStrictEqual([])
  })

  it('stops when a non-component call cycle returns to a visited callable', () => {
    const source = component('Source')
    const sourceCallable = callable('Source')
    const intermediary = callable('Intermediary')
    const graph = ScopedCallGraph.parse({
      roots: [ComponentCallable.parse({ component: source, callable: sourceCallable })],
      edges: [
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: intermediary,
          callSite: callSite(2),
        }),
        ScopedCallGraphEdge.parse({
          source: intermediary,
          target: sourceCallable,
          callSite: callSite(3),
        }),
      ],
      unresolvedCalls: [],
    })

    expect(detectConnectionsFromCalls(graph, 'shop')).toStrictEqual([])
  })

  it('keeps the earliest source location when calls produce the same connection', () => {
    const source = component('Source')
    const target = component('Target')
    const sourceCallable = callable('Source')
    const targetCallable = callable('Target')
    const graph = ScopedCallGraph.parse({
      roots: [ComponentCallable.parse({ component: source, callable: sourceCallable })],
      edges: [
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: targetCallable,
          targetComponent: target,
          callSite: callSite(8, '/src/z.ts'),
        }),
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: targetCallable,
          targetComponent: target,
          callSite: callSite(9, '/src/a.ts'),
        }),
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: targetCallable,
          targetComponent: target,
          callSite: callSite(3, '/src/a.ts'),
        }),
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: targetCallable,
          targetComponent: target,
          callSite: callSite(10, '/src/a.ts'),
        }),
        ScopedCallGraphEdge.parse({
          source: sourceCallable,
          target: targetCallable,
          targetComponent: target,
          callSite: callSite(1, '/src/b.ts'),
        }),
      ],
      unresolvedCalls: [],
    })

    expect(detectConnectionsFromCalls(graph, 'shop')[0]?.sourceLocation).toMatchObject({
      filePath: '/src/a.ts',
      lineNumber: 3,
    })
  })

  it('turns unresolved root calls into uncertain connections', () => {
    const source = component('Source')
    const sourceCallable = callable('Source')
    const graph = ScopedCallGraph.parse({
      roots: [ComponentCallable.parse({ component: source, callable: sourceCallable })],
      edges: [],
      unresolvedCalls: [
        UnresolvedScopedCall.parse({
          sourceComponent: source,
          originCallSite: callSite(4),
          reason: 'Receiver type unresolved',
        }),
      ],
    })

    expect(detectConnectionsFromCalls(graph, 'shop')).toMatchObject([
      { target: '_unresolved', _uncertain: 'Receiver type unresolved' },
    ])
  })
})
