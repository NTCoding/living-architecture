import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'

/** @riviere-role value-object */
export class ComponentCallable {
  declare private readonly brand: 'ComponentCallable'
  readonly component: EnrichedComponent
  readonly callable: CallableReference

  static parse(params: {
    component: EnrichedComponent
    callable: CallableReference
  }): ComponentCallable {
    return new ComponentCallable(params)
  }

  private constructor(params: { component: EnrichedComponent; callable: CallableReference }) {
    this.component = params.component
    this.callable = params.callable
  }
}

/** @riviere-role value-object */
export class ScopedCallGraphEdge {
  declare private readonly brand: 'ScopedCallGraphEdge'
  readonly source: CallableReference
  readonly target: CallableReference
  readonly callSite: CallSite
  readonly targetComponent: EnrichedComponent | undefined

  static parse(params: {
    source: CallableReference
    target: CallableReference
    callSite: CallSite
    targetComponent?: EnrichedComponent
  }): ScopedCallGraphEdge {
    return new ScopedCallGraphEdge(params)
  }

  private constructor(params: {
    source: CallableReference
    target: CallableReference
    callSite: CallSite
    targetComponent?: EnrichedComponent
  }) {
    this.source = params.source
    this.target = params.target
    this.callSite = params.callSite
    this.targetComponent = params.targetComponent
  }
}

/** @riviere-role value-object */
export class UnresolvedScopedCall {
  declare private readonly brand: 'UnresolvedScopedCall'
  readonly sourceComponent: EnrichedComponent
  readonly originCallSite: CallSite
  readonly reason: string

  static parse(params: {
    sourceComponent: EnrichedComponent
    originCallSite: CallSite
    reason: string
  }): UnresolvedScopedCall {
    return new UnresolvedScopedCall(params)
  }

  private constructor(params: {
    sourceComponent: EnrichedComponent
    originCallSite: CallSite
    reason: string
  }) {
    this.sourceComponent = params.sourceComponent
    this.originCallSite = params.originCallSite
    this.reason = params.reason
  }
}

/** @riviere-role value-object */
export class ScopedCallGraph {
  declare private readonly brand: 'ScopedCallGraph'
  readonly roots: readonly ComponentCallable[]
  readonly edges: readonly ScopedCallGraphEdge[]
  readonly unresolvedCalls: readonly UnresolvedScopedCall[]

  static parse(params: {
    roots: readonly ComponentCallable[]
    edges: readonly ScopedCallGraphEdge[]
    unresolvedCalls: readonly UnresolvedScopedCall[]
  }): ScopedCallGraph {
    return new ScopedCallGraph(params)
  }

  private constructor(params: {
    roots: readonly ComponentCallable[]
    edges: readonly ScopedCallGraphEdge[]
    unresolvedCalls: readonly UnresolvedScopedCall[]
  }) {
    this.roots = params.roots
    this.edges = params.edges
    this.unresolvedCalls = params.unresolvedCalls
  }
}
