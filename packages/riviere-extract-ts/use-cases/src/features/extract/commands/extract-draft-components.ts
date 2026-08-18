import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'

/** @riviere-role command-use-case */
export class ExtractDraftComponents {
  constructor(private readonly riviereProjectRepository: RiviereProjectRepository) {}

  execute(extractDraftComponentsInput: ExtractDraftComponentsInput): ExtractDraftComponentsResult {
    try {
      const riviereProject = loadProjectFromInput(
        this.riviereProjectRepository,
        extractDraftComponentsInput,
      )

      return {
        result: riviereProject.extractDraftComponents({
          sourceFileSelection: extractDraftComponentsInput.sourceFileSelection,
          allowIncomplete: extractDraftComponentsInput.allowIncomplete,
          includeConnections: extractDraftComponentsInput.includeConnections,
        }),
      }
    } catch (error) {
      if (error instanceof ConnectionDetectionError) {
        return {
          result: {
            kind: 'connectionDetectionFailure',
            message: `${error.file}:${error.line}: ${error.reason} — ${error.typeName}`,
          },
        }
      }
      if (error instanceof ExtractionConfigError) {
        return {
          result: {
            code: error.code,
            kind: 'configFailure',
            message: error.message,
          },
        }
      }
      if (error instanceof ExtractionDataAccessError) {
        return { result: { code: error.code, kind: 'dataAccessFailure', message: error.message } }
      }
      throw error
    }
  }
}

function loadProjectFromInput(
  riviereProjectRepository: RiviereProjectRepository,
  extractDraftComponentsInput: ExtractDraftComponentsInput,
) {
  return riviereProjectRepository.load({
    projectRoot: extractDraftComponentsInput.projectRoot ?? process.cwd(),
    configPath: extractDraftComponentsInput.configPath,
    useTsConfig: extractDraftComponentsInput.useTsConfig,
  })
}
