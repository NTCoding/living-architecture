import type {
  RiviereGraph, Component 
} from '@living-architecture/riviere-schema'
import type {
  ComponentId, LinkId 
} from './branded-types'
import type {
  Flow, SearchWithFlowResult 
} from './flow-types'
import {
  findEntryPoints,
  traceFlowFrom,
  queryFlows,
  searchWithFlowContext,
  type SearchWithFlowOptions,
} from './flow-queries'

export class FlowQueries {
  constructor(private readonly graph: RiviereGraph) {}

  entryPoints(): Component[] {
    return findEntryPoints(this.graph)
  }

  trace(startComponentId: ComponentId): {
    componentIds: ComponentId[]
    linkIds: LinkId[]
  } {
    return traceFlowFrom(this.graph, startComponentId)
  }

  all(): Flow[] {
    return queryFlows(this.graph)
  }

  searchWithFlow(query: string, options: SearchWithFlowOptions): SearchWithFlowResult {
    return searchWithFlowContext(this.graph, query, options)
  }
}
