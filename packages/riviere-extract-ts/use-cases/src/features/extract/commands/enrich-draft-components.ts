import { ExtractionProjectRepository } from '../data-access/extraction-project/extraction-project-repository'
import { ExtractionConfigError } from '../data-access/extraction-project/extraction-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts/domain/connection-detection/connection-detection-error'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/extraction-project/extraction-project-error'

/** @riviere-role command-use-case */
export class EnrichDraftComponents {
  constructor(private readonly extractionProjectRepository: ExtractionProjectRepository) {}

  execute(enrichDraftComponentsInput: EnrichDraftComponentsInput): EnrichDraftComponentsResult {
    try {
      const extractionProject = this.extractionProjectRepository.loadFromDraftEnrichment({
        configPath: enrichDraftComponentsInput.configPath,
        draftComponentsPath: enrichDraftComponentsInput.draftComponentsPath,
        useTsConfig: enrichDraftComponentsInput.useTsConfig,
      })

      return extractionProject.enrichDraftComponents({
        allowIncomplete: enrichDraftComponentsInput.allowIncomplete,
        includeConnections: enrichDraftComponentsInput.includeConnections,
      })
    } catch (error) {
      if (error instanceof ConnectionDetectionError) {
        return {
          kind: 'connectionDetectionFailure',
          message: `${error.file}:${error.line}: ${error.reason} — ${error.typeName}`,
        }
      }
      if (error instanceof ExtractionConfigError) {
        return {
          code: error.code,
          kind: 'configFailure',
          message: error.message,
        }
      }
      if (error instanceof ExtractionDataAccessError) {
        return { code: error.code, kind: 'dataAccessFailure', message: error.message }
      }
      throw error
    }
  }
}
