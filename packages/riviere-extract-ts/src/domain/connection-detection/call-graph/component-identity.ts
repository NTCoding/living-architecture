import { ComponentId } from '@living-architecture/riviere-schema/component-id'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/** @riviere-role domain-service */
export function componentIdentity(component: EnrichedComponent): string {
  return ComponentId.parseFromParts({
    domain: component.domain,
    module: component.module,
    type: component.type,
    name: component.name,
  }).toString()
}
