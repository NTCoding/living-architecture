import type { SourceLocation } from '@living-architecture/riviere-schema-published-language/schema'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function toSourceLocation(component: EnrichedComponent, repository: string): SourceLocation {
  return {
    repository,
    filePath: component.location.file,
    lineNumber: component.location.line,
  }
}
