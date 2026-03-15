import { MarkerType } from '@xyflow/react'
import type {
  Edge, Node 
} from '@xyflow/react'
import { STEP_DEFINITIONS } from './architecture-evolution-steps'
import {
  EDGE_DEFINITIONS, NODE_DEFINITIONS 
} from './architecture-evolution-topology'
import type {
  ArchitectureEvolutionEdgeData,
  ArchitectureEvolutionEdgeKind,
  ArchitectureEvolutionNodeData,
  ArchitectureEvolutionView,
  EdgeDefinition,
} from './architecture-evolution-types'

export type {
  ArchitectureEvolutionCapability,
  ArchitectureEvolutionCommit,
  ArchitectureEvolutionEdgeData,
  ArchitectureEvolutionNodeData,
  ArchitectureEvolutionView,
} from './architecture-evolution-types'

const NODE_DEFINITIONS_BY_ID = new Map(NODE_DEFINITIONS.map((node) => [node.id, node]))

function getNodeVisualState(
  nodeId: string,
  ghostedNodeIds: ReadonlySet<string>,
  changedNodeIds: ReadonlySet<string>,
): ArchitectureEvolutionNodeData['state'] {
  if (ghostedNodeIds.has(nodeId)) return 'ghosted'
  if (changedNodeIds.has(nodeId)) return 'changed'
  return 'active'
}

function getCapabilityState(
  nodeState: ArchitectureEvolutionNodeData['state'],
  capabilityId: string,
  ghostedCapabilityIds: ReadonlySet<string>,
): ArchitectureEvolutionNodeData['state'] {
  if (nodeState === 'ghosted') return 'ghosted'
  if (ghostedCapabilityIds.has(capabilityId)) return 'ghosted'
  return 'active'
}

function buildNodes(stepIndex: number): readonly Node<ArchitectureEvolutionNodeData>[] {
  const step = STEP_DEFINITIONS[stepIndex]

  if (step === undefined) {
    throw new RangeError(`Unknown architecture evolution step: ${stepIndex}`)
  }

  const ghostedNodeIds = new Set(step.ghostedNodeIds)
  const changedNodeIds = new Set(step.changedNodeIds)
  const ghostedCapabilityIds = new Set(step.ghostedCapabilityIds)

  return NODE_DEFINITIONS.map((node) => {
    const state = getNodeVisualState(node.id, ghostedNodeIds, changedNodeIds)

    return {
      id: node.id,
      type: 'architecture',
      position: node.position,
      draggable: false,
      selectable: false,
      data: {
        label: node.label,
        subtitle: node.subtitle,
        icon: node.icon,
        kind: node.kind,
        state,
        capabilities: node.capabilities.map((capability) => ({
          id: capability.id,
          label: capability.label,
          state: getCapabilityState(state, capability.id, ghostedCapabilityIds),
        })),
      },
    }
  })
}

function getHorizontalHandleSet(
  sourceX: number,
  targetX: number,
): {
  readonly sourceHandle: string
  readonly targetHandle: string
} {
  if (sourceX <= targetX) {
    return {
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    }
  }

  return {
    sourceHandle: 'left-source',
    targetHandle: 'right-target',
  }
}

function getVerticalHandleSet(
  sourceY: number,
  targetY: number,
): {
  readonly sourceHandle: string
  readonly targetHandle: string
} {
  if (sourceY <= targetY) {
    return {
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    }
  }

  return {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target',
  }
}

function getHandles(
  sourceId: string,
  targetId: string,
): {
  readonly sourceHandle: string
  readonly targetHandle: string
} {
  const source = NODE_DEFINITIONS_BY_ID.get(sourceId)
  const target = NODE_DEFINITIONS_BY_ID.get(targetId)

  if (source === undefined || target === undefined) {
    throw new TypeError(`Unknown edge endpoint: ${sourceId} -> ${targetId}`)
  }

  const deltaX = target.position.x - source.position.x
  const deltaY = target.position.y - source.position.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return getHorizontalHandleSet(source.position.x, target.position.x)
  }

  return getVerticalHandleSet(source.position.y, target.position.y)
}

function getEdgeState(
  edgeId: string,
  activeEdgeIds: ReadonlySet<string>,
  ghostedEdgeIds: ReadonlySet<string>,
  changedEdgeIds: ReadonlySet<string>,
): ArchitectureEvolutionEdgeData['state'] {
  if (changedEdgeIds.has(edgeId) && activeEdgeIds.has(edgeId)) return 'changed'
  if (changedEdgeIds.has(edgeId) && ghostedEdgeIds.has(edgeId)) return 'ghosted'
  if (activeEdgeIds.has(edgeId)) return 'active'
  if (ghostedEdgeIds.has(edgeId)) return 'ghosted'
  return 'hidden'
}

function getEdgeColor(kind: ArchitectureEvolutionEdgeKind): string {
  if (kind === 'query') return 'var(--node-ui)'
  if (kind === 'event') return 'var(--amber)'
  return 'var(--node-api)'
}

function getLabelStrokeOpacity(state: ArchitectureEvolutionEdgeData['state']): number {
  if (state === 'ghosted') return 0.18
  if (state === 'changed') return 0.65
  return 0.28
}

function getEdgeOpacity(
  edge: EdgeDefinition,
  state: ArchitectureEvolutionEdgeData['state'],
): number {
  if (state === 'ghosted') return 0.18
  if (edge.kind === 'event') return 0.88
  return 0.74
}

function buildEdgeMarkers(
  edge: EdgeDefinition,
  color: string,
): Pick<Edge, 'markerEnd' | 'markerStart'> {
  if (edge.bidirectional === true) {
    return {
      markerStart: {
        type: MarkerType.ArrowClosed,
        color,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
      },
    }
  }

  return {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color,
    },
  }
}

function buildEdges(stepIndex: number): readonly Edge<ArchitectureEvolutionEdgeData>[] {
  const step = STEP_DEFINITIONS[stepIndex]

  if (step === undefined) {
    throw new RangeError(`Unknown architecture evolution step: ${stepIndex}`)
  }

  const activeEdgeIds = new Set(step.activeEdgeIds)
  const ghostedEdgeIds = new Set(step.ghostedEdgeIds)
  const changedEdgeIds = new Set(step.changedEdgeIds)

  return EDGE_DEFINITIONS.map((edge) => {
    const handles = getHandles(edge.source, edge.target)
    const state = getEdgeState(edge.id, activeEdgeIds, ghostedEdgeIds, changedEdgeIds)
    const color = getEdgeColor(edge.kind)

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      hidden: state === 'hidden',
      selectable: false,
      focusable: false,
      animated: false,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: edge.label,
      labelShowBg: true,
      labelBgPadding: [10, 6],
      labelBgBorderRadius: 999,
      labelBgStyle: {
        fill: 'var(--bg-secondary)',
        fillOpacity: state === 'ghosted' ? 0.45 : 0.92,
        stroke: color,
        strokeOpacity: getLabelStrokeOpacity(state),
      },
      labelStyle: {
        fill: state === 'ghosted' ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontSize: 11,
        fontWeight: state === 'changed' ? 700 : 600,
      },
      data: {
        label: edge.label,
        kind: edge.kind,
        state,
      },
      style: {
        stroke: color,
        strokeWidth: state === 'changed' ? 3.2 : 2.4,
        opacity: getEdgeOpacity(edge, state),
        strokeDasharray: edge.kind === 'event' ? '6 4' : undefined,
      },
      ...buildEdgeMarkers(edge, color),
    }
  })
}

function countActiveServices(nodes: readonly Node<ArchitectureEvolutionNodeData>[]): number {
  return nodes.filter((node) => node.data.kind === 'service' && node.data.state !== 'ghosted')
    .length
}

function countGhostedNodes(nodes: readonly Node<ArchitectureEvolutionNodeData>[]): number {
  return nodes.filter((node) => node.data.state === 'ghosted').length
}

export const ARCHITECTURE_EVOLUTION_STEP_COUNT = STEP_DEFINITIONS.length

export function getArchitectureEvolutionView(stepIndex: number): ArchitectureEvolutionView {
  const normalizedStepIndex = Math.max(0, Math.min(stepIndex, STEP_DEFINITIONS.length - 1))
  const step = STEP_DEFINITIONS[normalizedStepIndex]

  if (step === undefined) {
    throw new RangeError(`Unknown architecture evolution step: ${stepIndex}`)
  }

  const nodes = buildNodes(normalizedStepIndex)

  return {
    commit: step.commit,
    stepIndex: normalizedStepIndex,
    totalSteps: STEP_DEFINITIONS.length,
    nodes,
    edges: buildEdges(normalizedStepIndex),
    activeServiceCount: countActiveServices(nodes),
    ghostedNodeCount: countGhostedNodes(nodes),
  }
}
