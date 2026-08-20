import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import type { FindChangedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-changed-source-files'
import type { FindSpecifiedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-specified-source-files'
import { resolveSourceFileSelection } from '@living-architecture/riviere-extract-ts-domain-model/domain/resolve-source-file-selection'

/** @riviere-role command-use-case */
export class ExtractDraftComponents {
  constructor(
    private readonly riviereProjectRepository: RiviereProjectRepository,
    private readonly findChangedSourceFiles: FindChangedSourceFiles,
    private readonly findSpecifiedSourceFiles: FindSpecifiedSourceFiles,
  ) {}

  execute(extractDraftComponentsInput: ExtractDraftComponentsInput): ExtractDraftComponentsResult {
    try {
      const selection = resolveSourceFileSelection(
        extractDraftComponentsInput.sourceFileSelectionRequest,
        this.findChangedSourceFiles,
        this.findSpecifiedSourceFiles,
      )
      const riviereProject = loadProjectFromInput(
        this.riviereProjectRepository,
        extractDraftComponentsInput,
      )

      const result = riviereProject.extractDraftComponents({
        sourceFileSelection: selection.sourceFileSelection,
        allowIncomplete: extractDraftComponentsInput.allowIncomplete,
        includeConnections: extractDraftComponentsInput.includeConnections,
      })
      return { result, warnings: selection.warnings }
    } catch (error) {
      if (error instanceof ConnectionDetectionError) {
        return {
          warnings: [],
          result: {
            kind: 'connectionDetectionFailure',
            message: `${error.file}:${error.line}: ${error.reason} — ${error.typeName}`,
          },
        }
      }
      if (error instanceof ExtractionConfigError) {
        return {
          warnings: [],
          result: {
            code: error.code,
            kind: 'configFailure',
            message: error.message,
          },
        }
      }
      if (error instanceof ExtractionDataAccessError) {
        return {
          warnings: [],
          result: { code: error.code, kind: 'dataAccessFailure', message: error.message },
        }
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
