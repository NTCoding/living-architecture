import { ExtractionProjectRepository } from '../infra/persistence/extraction-project/extraction-project-repository'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'

/** @riviere-role command-use-case */
export class EnrichDraftComponents {
  constructor(private readonly extractionProjectRepository: ExtractionProjectRepository) {}

  execute(enrichDraftComponentsInput: EnrichDraftComponentsInput): EnrichDraftComponentsResult {
    const extractionProject = this.extractionProjectRepository.loadFromDraftEnrichment({
      configPath: enrichDraftComponentsInput.configPath,
      draftComponentsPath: enrichDraftComponentsInput.draftComponentsPath,
      useTsConfig: enrichDraftComponentsInput.useTsConfig,
    })

    return extractionProject.enrichDraftComponents({
      allowIncomplete: enrichDraftComponentsInput.allowIncomplete,
      includeConnections: enrichDraftComponentsInput.includeConnections,
    })
  }
}
