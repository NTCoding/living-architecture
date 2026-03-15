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
  ArchitectureEvolutionTransition,
  ArchitectureEvolutionView,
  EdgeDefinition,
  StepDefinition,
} from './architecture-evolution-types'

export type {
  ArchitectureEvolutionCapability,
  ArchitectureEvolutionCommit,
  ArchitectureEvolutionEdgeData,
  ArchitectureEvolutionNodeData,
  ArchitectureEvolutionTransition,
  ArchitectureEvolutionView,
} from './architecture-evolution-types'

type ConnectionState = ArchitectureEvolutionEdgeData['state']

const NODE_DEFINITIONS_BY_ID = new Map(NODE_DEFINITIONS.map((node) => [node.id, node]))

function getStep(stepIndex: number): StepDefinition {
  const step = STEP_DEFINITIONS[stepIndex]

  if (step === undefined) {
    throw new RangeError(`Unknown architecture evolution step: ${stepIndex}`)
  }

  return step
}

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

function getVisibleTransition(
  currentState: ArchitectureEvolutionNodeData['state'],
  previousState: ArchitectureEvolutionNodeData['state'] | 'hidden',
): ArchitectureEvolutionTransition {
  if (currentState === 'ghosted' && previousState !== 'ghosted' && previousState !== 'hidden') {
    return 'removed'
  }

  if (
    (currentState === 'active' || currentState === 'changed') &&
    (previousState === 'ghosted' || previousState === 'hidden')
  ) {
    return 'added'
  }

  if (currentState === 'changed') return 'changed'

  return 'unchanged'
}

function buildNodes(stepIndex: number): readonly Node<ArchitectureEvolutionNodeData>[] {
  const currentStep = getStep(stepIndex)
  const previousStep = stepIndex > 0 ? getStep(stepIndex - 1) : null
  const currentGhostedNodeIds = new Set(currentStep.ghostedNodeIds)
  const currentChangedNodeIds = new Set(currentStep.changedNodeIds)
  const currentGhostedCapabilityIds = new Set(currentStep.ghostedCapabilityIds)
  const previousGhostedNodeIds = new Set(previousStep?.ghostedNodeIds ?? [])
  const previousChangedNodeIds = new Set(previousStep?.changedNodeIds ?? [])
  const previousGhostedCapabilityIds = new Set(previousStep?.ghostedCapabilityIds ?? [])

  return NODE_DEFINITIONS.map((node) => {
    const state = getNodeVisualState(node.id, currentGhostedNodeIds, currentChangedNodeIds)
    const previousState =
      previousStep === null
        ? 'active'
        : getNodeVisualState(node.id, previousGhostedNodeIds, previousChangedNodeIds)

    return {
      id: node.id,
      type: 'architecture',
      position: node.position,
      draggable: false,
      selectable: false,
      zIndex: state === 'ghosted' ? 1 : 12,
      data: {
        label: node.label,
        subtitle: node.subtitle,
        icon: node.icon,
        kind: node.kind,
        state,
        transition: getVisibleTransition(state, previousState),
        capabilities: node.capabilities.map((capability) => {
          const capabilityState = getCapabilityState(
            state,
            capability.id,
            currentGhostedCapabilityIds,
          )
          const previousCapabilityState =
            previousStep === null
              ? 'active'
              : getCapabilityState(previousState, capability.id, previousGhostedCapabilityIds)

          return {
            id: capability.id,
            label: capability.label,
            state: capabilityState,
            transition: getVisibleTransition(capabilityState, previousCapabilityState),
          }
        }),
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
): ConnectionState {
  if (changedEdgeIds.has(edgeId) && activeEdgeIds.has(edgeId)) return 'changed'
  if (changedEdgeIds.has(edgeId) && ghostedEdgeIds.has(edgeId)) return 'ghosted'
  if (activeEdgeIds.has(edgeId)) return 'active'
  if (ghostedEdgeIds.has(edgeId)) return 'ghosted'
  return 'hidden'
}

function getConnectionTransition(
  currentState: ConnectionState,
  previousState: ConnectionState,
): ArchitectureEvolutionTransition {
  if (currentState === 'hidden') return 'unchanged'

  if (currentState === 'ghosted' && previousState !== 'ghosted' && previousState !== 'hidden') {
    return 'removed'
  }

  if (
    (currentState === 'active' || currentState === 'changed') &&
    (previousState === 'hidden' || previousState === 'ghosted')
  ) {
    return 'added'
  }

  if (currentState === 'changed') return 'changed'

  return 'unchanged'
}

function getEdgeColor(kind: ArchitectureEvolutionEdgeKind): string {
  if (kind === 'query') return 'var(--green)'
  if (kind === 'event') return 'var(--amber)'
  return 'var(--blue)'
}

function getEdgeOpacity(
  state: ConnectionState,
  transition: ArchitectureEvolutionTransition,
): number {
  if (state === 'ghosted') return 0.24
  if (transition !== 'unchanged') return 1
  return 0.34
}

function getEdgeZIndex(
  state: ConnectionState,
  transition: ArchitectureEvolutionTransition,
): number {
  if (state === 'hidden') return 0
  if (transition !== 'unchanged') return 40
  if (state === 'ghosted') return 4
  return 12
}

function buildEdgeMarkers(
  edge: EdgeDefinition,
  color: string,
): Pick<Edge, 'markerEnd' | 'markerStart'> {
  if (edge.markerMode === 'none') {
    return {}
  }

  return {
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color,
    },
  }
}

function buildEdges(stepIndex: number): readonly Edge<ArchitectureEvolutionEdgeData>[] {
  const currentStep = getStep(stepIndex)
  const previousStep = stepIndex > 0 ? getStep(stepIndex - 1) : null
  const activeEdgeIds = new Set(currentStep.activeEdgeIds)
  const ghostedEdgeIds = new Set(currentStep.ghostedEdgeIds)
  const changedEdgeIds = new Set(currentStep.changedEdgeIds)
  const previousActiveEdgeIds = new Set(previousStep?.activeEdgeIds ?? [])
  const previousGhostedEdgeIds = new Set(previousStep?.ghostedEdgeIds ?? [])
  const previousChangedEdgeIds = new Set(previousStep?.changedEdgeIds ?? [])

  return EDGE_DEFINITIONS.map((edge) => {
    const handles = getHandles(edge.source, edge.target)
    const state = getEdgeState(edge.id, activeEdgeIds, ghostedEdgeIds, changedEdgeIds)
    const previousState =
      previousStep === null
        ? getEdgeState(edge.id, activeEdgeIds, ghostedEdgeIds, changedEdgeIds)
        : getEdgeState(
          edge.id,
          previousActiveEdgeIds,
          previousGhostedEdgeIds,
          previousChangedEdgeIds,
        )
    const transition = getConnectionTransition(state, previousState)
    const color = getEdgeColor(edge.kind)

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'architecture',
      hidden: state === 'hidden',
      selectable: true,
      focusable: true,
      animated: false,
      zIndex: getEdgeZIndex(state, transition),
      interactionWidth: 28,
      sourceHandle: edge.sourceHandle ?? handles.sourceHandle,
      targetHandle: edge.targetHandle ?? handles.targetHandle,
      pathOptions: edge.pathOptions,
      data: {
        label: edge.label,
        subtitle: edge.subtitle,
        description: edge.description,
        sourcePortLabel: edge.sourcePortLabel,
        targetPortLabel: edge.targetPortLabel,
        pathShape: edge.type === 'straight' ? 'straight' : 'smoothstep',
        pathOptions: edge.pathOptions ?? {},
        kind: edge.kind,
        state,
        transition,
        showLabel: false,
      },
      style: {
        stroke: color,
        strokeWidth: transition === 'unchanged' ? 2.6 : 4.6,
        opacity: getEdgeOpacity(state, transition),
        strokeDasharray: edge.kind === 'event' ? '8 6' : undefined,
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
  const step = getStep(normalizedStepIndex)
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
