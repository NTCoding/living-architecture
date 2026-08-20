import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import type { LoadDraftComponents } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-draft-components'

/** @riviere-role command-use-case */
export class EnrichDraftComponents {
  constructor(
    private readonly riviereProjectRepository: RiviereProjectRepository,
    private readonly loadDraftComponents: LoadDraftComponents,
  ) {}

  execute(enrichDraftComponentsInput: EnrichDraftComponentsInput): EnrichDraftComponentsResult {
    try {
      const riviereProject = this.riviereProjectRepository.load({
        projectRoot: enrichDraftComponentsInput.projectRoot ?? process.cwd(),
        configPath: enrichDraftComponentsInput.configPath,
        useTsConfig: enrichDraftComponentsInput.useTsConfig,
      })

      return {
        result: riviereProject.enrichDraftComponents({
          draftComponentsPath: enrichDraftComponentsInput.draftComponentsPath,
          loadDraftComponents: this.loadDraftComponents,
          allowIncomplete: enrichDraftComponentsInput.allowIncomplete,
          includeConnections: enrichDraftComponentsInput.includeConnections,
        }),
        ...(enrichDraftComponentsInput.output === undefined
          ? {}
          : { outputPath: enrichDraftComponentsInput.output }),
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
