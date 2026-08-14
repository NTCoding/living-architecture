import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from './component-id'

/** @riviere-role domain-service */
export function detectOrphanComponents(graph: RiviereGraph): ComponentId[] {
  const connectedComponentIds = new Set<string>()
  graph.links.forEach((link) => {
    connectedComponentIds.add(link.source)
    connectedComponentIds.add(link.target)
  })

  return graph.components
    .filter((component) => !connectedComponentIds.has(component.id))
    .map((component) => ComponentId.parse(component.id))
}
