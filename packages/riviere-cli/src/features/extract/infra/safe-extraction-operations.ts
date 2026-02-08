import { Project } from 'ts-morph'
import {
  extractComponents,
  enrichComponents,
  matchesGlob,
  detectConnections,
  type EnrichedComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { loadDraftComponentsFromFile } from '../../../platform/infra/extraction-config/draft-component-loader'
import { formatTimingLine } from '../../../platform/infra/cli-presentation/format-extraction-stats'
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'

export function loadOrExtractComponents(
  project: Project,
  sourceFilePaths: string[],
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  enrichPath: string | undefined,
) {
  if (enrichPath === undefined) {
    return extractComponents(project, sourceFilePaths, resolvedConfig, matchesGlob, configDir)
  }
  return loadDraftComponentsFromFile(enrichPath)
}

export function enrichComponentsSafe(
  draftComponents: Parameters<typeof enrichComponents>[0],
  resolvedConfig: ResolvedExtractionConfig,
  project: Project,
  configDir: string,
  allowIncomplete: boolean,
) {
  const result = enrichComponents(draftComponents, resolvedConfig, project, matchesGlob, configDir)
  if (result.failures.length > 0) {
    const failedFields = result.failures.map((f) => f.field)
    if (!allowIncomplete) {
      throw new ExtractionFieldFailureError(failedFields)
    }
    console.error(
      `Warning: Enrichment failed for ${failedFields.length} field(s): ${failedFields.join(', ')}`,
    )
  }
  return result
}

export function detectConnectionsSafe(
  project: Project,
  components: readonly EnrichedComponent[],
  moduleGlobs: string[],
  repository: string,
  allowIncomplete: boolean,
  showStats: boolean,
) {
  const result = detectConnections(
    project,
    components,
    {
      allowIncomplete,
      moduleGlobs,
      repository,
    },
    matchesGlob,
  )
  if (showStats) {
    console.error(formatTimingLine(result.timings))
  }
  return result
}
