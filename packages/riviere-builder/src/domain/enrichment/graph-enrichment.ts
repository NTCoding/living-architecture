import type { BuilderGraph } from '../builder-graph'
import type { EnrichmentInput } from './enrichment-types'
import { InvalidEnrichmentTargetError } from './enrichment-errors'
import { createComponentNotFoundError } from '../../builder-internals'
import { deduplicateStateTransitions } from './deduplicate-transitions'
import { deduplicateStrings } from '../../platform/collection-utils/deduplicate-strings'
import { mergeBehavior } from './merge-behavior'

export class GraphEnrichment {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  enrichComponent(id: string, enrichment: EnrichmentInput): void {
    const component = this.graph.components.find((c) => c.id === id)
    if (!component) {
      throw createComponentNotFoundError(this.graph.components, id)
    }
    if (component.type !== 'DomainOp') {
      throw new InvalidEnrichmentTargetError(id, component.type)
    }
    if (enrichment.entity !== undefined) {
      component.entity = enrichment.entity
    }
    if (enrichment.stateChanges !== undefined) {
      const existing = component.stateChanges ?? []
      const newItems = deduplicateStateTransitions(existing, enrichment.stateChanges)
      component.stateChanges = [...existing, ...newItems]
    }
    if (enrichment.businessRules !== undefined) {
      const existing = component.businessRules ?? []
      const newItems = deduplicateStrings(existing, enrichment.businessRules)
      component.businessRules = [...existing, ...newItems]
    }
    if (enrichment.behavior !== undefined) {
      component.behavior = mergeBehavior(component.behavior, enrichment.behavior)
    }
    if (enrichment.signature !== undefined) {
      component.signature = enrichment.signature
    }
  }
}
