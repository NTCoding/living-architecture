import type { SourceLocation } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'

/** @riviere-role value-object */
export interface AsyncDetectionOptions {
  strict: boolean
  repository: string
}

/** @riviere-role domain-service */
export function toSourceLocation(component: EnrichedComponent, repository: string): SourceLocation {
  return {
    repository,
    filePath: component.location.file,
    lineNumber: component.location.line,
  }
}
