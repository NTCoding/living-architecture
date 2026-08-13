import type { DomainOpComponent } from '@living-architecture/riviere-schema/schema'
import type { BuilderGraph } from '../builder-graph'
import { InvalidEnrichmentTargetError } from './enrichment-errors'
import { createComponentNotFoundError } from '../construction/builder-internals'
import { deduplicateStateTransitions } from './deduplicate-transitions'
import { deduplicateStrings } from '../collection-utils/deduplicate-strings'
import { mergeBehavior } from './merge-behavior'

type EnrichmentInput = Readonly<
  Pick<DomainOpComponent, 'entity' | 'stateChanges' | 'businessRules' | 'behavior' | 'signature'>
>

/** @riviere-role domain-service */
export class GraphEnrichment {
  private graph: BuilderGraph
  private readonly updateGraph: (graph: BuilderGraph) => void

  constructor(graph: BuilderGraph, updateGraph: (graph: BuilderGraph) => void) {
    this.graph = graph
    this.updateGraph = updateGraph
  }

  enrichComponent(id: string, enrichment: EnrichmentInput): void {
    const componentIndex = this.graph.components.findIndex((component) => component.id === id)
    const component = this.graph.components[componentIndex]
    if (!component) {
      throw createComponentNotFoundError(this.graph.components, id)
    }
    if (component.type !== 'DomainOp') {
      throw new InvalidEnrichmentTargetError(id, component.type)
    }
    const entityEnriched: DomainOpComponent = {
      ...component,
      ...(enrichment.entity !== undefined && { entity: enrichment.entity }),
    }
    const stateEnriched: DomainOpComponent = (() => {
      if (enrichment.stateChanges === undefined) {
        return entityEnriched
      }
      const existing = entityEnriched.stateChanges ?? []
      const newItems = deduplicateStateTransitions(existing, enrichment.stateChanges)
      return {
        ...entityEnriched,
        stateChanges: [...existing, ...newItems],
      }
    })()
    const rulesEnriched: DomainOpComponent = (() => {
      if (enrichment.businessRules === undefined) {
        return stateEnriched
      }
      const existing = stateEnriched.businessRules ?? []
      const newItems = deduplicateStrings(existing, enrichment.businessRules)
      return {
        ...stateEnriched,
        businessRules: [...existing, ...newItems],
      }
    })()
    const updatedComponent: DomainOpComponent = {
      ...rulesEnriched,
      ...(enrichment.behavior !== undefined && {
        behavior: mergeBehavior(rulesEnriched.behavior, enrichment.behavior),
      }),
      ...(enrichment.signature !== undefined && { signature: enrichment.signature }),
    }

    this.graph = this.graph.withComponentAt(componentIndex, updatedComponent)
    this.updateGraph(this.graph)
  }
}
