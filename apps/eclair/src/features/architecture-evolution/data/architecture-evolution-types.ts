import type { Edge, Node } from '@xyflow/react'

export type ArchitectureEvolutionVisualState = 'active' | 'changed' | 'ghosted'
export type ArchitectureEvolutionNodeKind = 'client' | 'service' | 'database'
export type ArchitectureEvolutionEdgeKind = 'query' | 'write' | 'event'
export type ArchitectureEvolutionTransition = 'unchanged' | 'added' | 'removed' | 'changed'

export interface ArchitectureEvolutionCapability {
  readonly id: string
  readonly label: string
  readonly state: ArchitectureEvolutionVisualState
  readonly transition: ArchitectureEvolutionTransition
}

export interface ArchitectureEvolutionNodeData extends Record<string, unknown> {
  readonly label: string
  readonly subtitle: string
  readonly icon: string
  readonly kind: ArchitectureEvolutionNodeKind
  readonly state: ArchitectureEvolutionVisualState
  readonly transition: ArchitectureEvolutionTransition
  readonly capabilities: readonly ArchitectureEvolutionCapability[]
}

export interface ArchitectureEvolutionEdgeData extends Record<string, unknown> {
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly sourcePortLabel: string
  readonly targetPortLabel: string
  readonly graphvizPath?: string
  readonly pathShape: 'smoothstep' | 'straight'
  readonly pathOptions: {
    readonly offset?: number
    readonly borderRadius?: number
    readonly stepPosition?: number
  }
  readonly kind: ArchitectureEvolutionEdgeKind
  readonly state: ArchitectureEvolutionVisualState | 'hidden'
  readonly transition: ArchitectureEvolutionTransition
  readonly showLabel: boolean
}

export interface ArchitectureEvolutionCommit {
  readonly title: string
  readonly shortHash: string
  readonly date: string
  readonly author: string
  readonly description: string
}

export interface ArchitectureEvolutionView {
  readonly commit: ArchitectureEvolutionCommit
  readonly stepIndex: number
  readonly totalSteps: number
  readonly nodes: readonly Node<ArchitectureEvolutionNodeData>[]
  readonly edges: readonly Edge<ArchitectureEvolutionEdgeData>[]
  readonly activeServiceCount: number
  readonly ghostedNodeCount: number
}

export interface NodeCapabilityDefinition {
  readonly id: string
  readonly label: string
}

export interface NodeDefinition {
  readonly id: string
  readonly label: string
  readonly subtitle: string
  readonly icon: string
  readonly kind: ArchitectureEvolutionNodeKind
  readonly position: {
    readonly x: number
    readonly y: number
  }
  readonly capabilities: readonly NodeCapabilityDefinition[]
}

export interface EdgeDefinition {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly sourcePortLabel: string
  readonly targetPortLabel: string
  readonly kind: ArchitectureEvolutionEdgeKind
  readonly sourceHandle?: string
  readonly targetHandle?: string
  readonly type?: 'smoothstep' | 'step' | 'straight'
  readonly markerMode?: 'end' | 'none'
  readonly pathOptions?: {
    readonly offset?: number
    readonly borderRadius?: number
    readonly stepPosition?: number
  }
}

export interface StepDefinition {
  readonly commit: ArchitectureEvolutionCommit
  readonly ghostedNodeIds: readonly string[]
  readonly changedNodeIds: readonly string[]
  readonly activeEdgeIds: readonly string[]
  readonly ghostedEdgeIds: readonly string[]
  readonly changedEdgeIds: readonly string[]
  readonly ghostedCapabilityIds: readonly string[]
}
