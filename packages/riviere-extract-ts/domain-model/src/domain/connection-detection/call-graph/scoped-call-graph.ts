import type { Project } from 'ts-morph'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { ComponentIndex } from '../component-index'
import type { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'
import { DetectedCall } from './detected-call'
import type { ResolvedCallTarget } from './resolved-call-target'

interface ScopedCallGraphInput {
  readonly project: Project
  readonly sourceFilePaths: readonly string[]
  readonly components: readonly EnrichedComponent[]
  readonly componentIndex: ComponentIndex
  readonly strict: boolean
}

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

  static from(input: ScopedCallGraphInput): ScopedCallGraph {
    const roots = input.components.flatMap((component) =>
      component
        .callableReferencesIn(input.project)
        .map((callable) => ComponentCallable.parse({ component, callable })),
    )
    const edges: ScopedCallGraphEdge[] = []
    const unresolvedCalls: UnresolvedScopedCall[] = []
    for (const root of roots) {
      traceCallable({
        ...input,
        root,
        callable: root.callable,
        edges,
        unresolvedCalls,
        visited: new Set([root.callable.toKey()]),
      })
    }
    return new ScopedCallGraph({ roots, edges, unresolvedCalls })
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

function traceCallable(
  input: ScopedCallGraphInput & {
    readonly root: ComponentCallable
    readonly callable: CallableReference
    readonly edges: ScopedCallGraphEdge[]
    readonly unresolvedCalls: UnresolvedScopedCall[]
    readonly visited: ReadonlySet<string>
    readonly originCallSite?: CallSite
  },
): void {
  const targets = DetectedCall.fromCallable(input.callable, input.project, input.strict).map(
    (call) =>
      call.resolveTarget({
        project: input.project,
        sourceFilePaths: input.sourceFilePaths,
        componentIndex: input.componentIndex,
        strict: input.strict,
      }),
  )
  for (const target of targets) {
    const originCallSite = input.originCallSite ?? target.call.callSite
    const nextCallable = recordResolvedCallTarget(input, target, originCallSite)
    if (nextCallable === undefined || input.visited.has(nextCallable.toKey())) continue
    traceCallable({
      ...input,
      callable: nextCallable,
      originCallSite,
      visited: new Set([...input.visited, nextCallable.toKey()]),
    })
  }
}

function recordResolvedCallTarget(
  input: {
    readonly root: ComponentCallable
    readonly callable: CallableReference
    readonly edges: ScopedCallGraphEdge[]
    readonly unresolvedCalls: UnresolvedScopedCall[]
  },
  target: ResolvedCallTarget,
  originCallSite: CallSite,
): CallableReference | undefined {
  const resolution = target.resolution
  switch (resolution.kind) {
    case 'unresolved': {
      const isRootCallable = input.callable.toKey() === input.root.callable.toKey()
      if (target.call.unresolvedReason !== undefined && !isRootCallable) return undefined
      input.unresolvedCalls.push(
        UnresolvedScopedCall.parse({
          sourceComponent: input.root.component,
          originCallSite,
          reason: resolution.reason,
        }),
      )
      return undefined
    }
    case 'dead-end':
      return undefined
    case 'component':
      input.edges.push(
        ScopedCallGraphEdge.parse({
          source: input.callable,
          target: resolution.callable,
          targetComponent: resolution.component,
          callSite: target.call.callSite,
        }),
      )
      return undefined
    case 'callable':
      input.edges.push(
        ScopedCallGraphEdge.parse({
          source: input.callable,
          target: resolution.callable,
          callSite: target.call.callSite,
        }),
      )
      return resolution.callable
  }
}
