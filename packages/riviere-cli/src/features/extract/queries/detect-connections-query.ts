import type { Project } from 'ts-morph'
import type {
  EnrichedComponent,
  ConnectionDetectionResult,
} from '@living-architecture/riviere-extract-ts'
import {
  detectConnections, matchesGlob 
} from '@living-architecture/riviere-extract-ts'

interface DetectConnectionsInput {
  allowIncomplete: boolean
  moduleGlobs: string[]
}

export function detectConnectionsQuery(
  project: Project,
  components: readonly EnrichedComponent[],
  options: DetectConnectionsInput,
): ConnectionDetectionResult {
  return detectConnections(
    project,
    components,
    {
      allowIncomplete: options.allowIncomplete,
      moduleGlobs: options.moduleGlobs,
    },
    matchesGlob,
  )
}
