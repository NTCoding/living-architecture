import { ExtractionProjectRepository } from '../data-access/extraction-project/extraction-project-repository'
import { ExtractionConfigError } from '../data-access/extraction-project/extraction-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/extraction-project/extraction-project-error'

/** @riviere-role command-use-case */
export class ExtractDraftComponents {
  constructor(private readonly extractionProjectRepository: ExtractionProjectRepository) {}

  execute(extractDraftComponentsInput: ExtractDraftComponentsInput): ExtractDraftComponentsResult {
    try {
      const extractionProject = loadProjectFromInput(
        this.extractionProjectRepository,
        extractDraftComponentsInput,
      )

      return extractionProject.extractDraftComponents({
        allowIncomplete: extractDraftComponentsInput.allowIncomplete,
        includeConnections: extractDraftComponentsInput.includeConnections,
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

function loadProjectFromInput(
  extractionProjectRepository: ExtractionProjectRepository,
  extractDraftComponentsInput: ExtractDraftComponentsInput,
) {
  if (extractDraftComponentsInput.sourceMode === 'pull-request') {
    return extractionProjectRepository.loadFromChangedProject({
      configPath: extractDraftComponentsInput.configPath,
      ...(extractDraftComponentsInput.baseBranch === undefined
        ? {}
        : { baseBranch: extractDraftComponentsInput.baseBranch }),
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  if (extractDraftComponentsInput.sourceMode === 'files') {
    return extractionProjectRepository.loadFromSelectedFiles({
      configPath: extractDraftComponentsInput.configPath,
      filePaths: extractDraftComponentsInput.files ?? [],
      useTsConfig: extractDraftComponentsInput.useTsConfig,
    })
  }

  return extractionProjectRepository.loadFromFullProject({
    configPath: extractDraftComponentsInput.configPath,
    useTsConfig: extractDraftComponentsInput.useTsConfig,
  })
}
