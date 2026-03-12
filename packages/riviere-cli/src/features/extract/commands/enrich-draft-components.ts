import { ExtractionProjectRepository } from '../infra/persistence/extraction-project/extraction-project-repository'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'

/** @riviere-role command-use-case */
export function enrichDraftComponents(
  enrichDraftComponentsInput: EnrichDraftComponentsInput,
): EnrichDraftComponentsResult {
  const extractionProjectRepository = new ExtractionProjectRepository()
  const extractionProject = extractionProjectRepository.loadFromDraftEnrichment({
    configPath: enrichDraftComponentsInput.configPath,
    draftComponentsPath: enrichDraftComponentsInput.draftComponentsPath,
    useTsConfig: enrichDraftComponentsInput.useTsConfig,
  })

  return extractionProject.enrichDraftComponents({
    allowIncomplete: enrichDraftComponentsInput.allowIncomplete,
    includeConnections: enrichDraftComponentsInput.includeConnections,
  })
}
