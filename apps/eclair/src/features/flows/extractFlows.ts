import {
  RiviereQuery,
  type Flow as QueryFlow,
  type FlowStep as QueryFlowStep,
} from '@living-architecture/riviere-query'
import type {
  Component, ExternalLink 
} from '@living-architecture/riviere-schema'
import type {
  RiviereGraph, SourceLocation, NodeType 
} from '@/types/riviere'

export interface EntryPoint {
  id: string
  type: NodeType
  name: string
  domain: string
  module?: string
  httpMethod?: string
  path?: string
  sourceLocation: SourceLocation
}

export interface FlowStepNode {
  id: string
  type: NodeType
  name: string
  module: string
  domain: string
  subscribedEvents?: string[]
}

export interface FlowStep {
  node: FlowStepNode
  edgeType: 'sync' | 'async' | null
  depth: number
  externalLinks: ExternalLink[]
}

export interface Flow {
  entryPoint: EntryPoint
  steps: FlowStep[]
}

function componentToFlowStepNode(component: Component): FlowStepNode {
  const node: FlowStepNode = {
    id: component.id,
    type: component.type,
    name: component.name,
    module: component.module,
    domain: component.domain,
  }

  if (component.type === 'EventHandler') {
    node.subscribedEvents = component.subscribedEvents
  }

  return node
}

function adaptFlowStep(queryStep: QueryFlowStep): FlowStep {
  const component = queryStep.component
  const linkType = queryStep.linkType

  return {
    node: componentToFlowStepNode(component),
    edgeType: linkType === undefined ? null : linkType,
    depth: queryStep.depth,
    externalLinks: queryStep.externalLinks,
  }
}

function adaptFlow(queryFlow: QueryFlow): Flow {
  const component = queryFlow.entryPoint

  const entryPoint: EntryPoint = {
    id: component.id,
    type: component.type,
    name: component.name,
    domain: component.domain,
    module: component.module,
    sourceLocation: component.sourceLocation,
  }

  if (component.type === 'API') {
    const apiComponent = component
    if (apiComponent.httpMethod !== undefined) {
      entryPoint.httpMethod = apiComponent.httpMethod
    }
    if (apiComponent.path !== undefined) {
      entryPoint.path = apiComponent.path
    }
  }

  return {
    entryPoint,
    steps: queryFlow.steps.map(adaptFlowStep),
  }
}

export function extractFlows(graph: RiviereGraph): Flow[] {
  const query = new RiviereQuery(graph)
  return query.flows().map(adaptFlow)
}
