import { ComponentId } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/** @riviere-role domain-service */
export function componentIdentity(component: EnrichedComponent): string {
  return ComponentId.create({
    domain: component.domain,
    module: component.module,
    type: component.type,
    name: component.name,
  }).toString()
}
