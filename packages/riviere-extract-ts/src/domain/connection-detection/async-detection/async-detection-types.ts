import type { SourceLocation } from '@living-architecture/riviere-schema/schema'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/** @riviere-role domain-service */
export function toSourceLocation(component: EnrichedComponent, repository: string): SourceLocation {
  return {
    repository,
    filePath: component.location.file,
    lineNumber: component.location.line,
  }
}
