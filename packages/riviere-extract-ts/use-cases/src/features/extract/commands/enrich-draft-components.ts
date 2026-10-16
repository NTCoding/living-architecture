import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { EnrichDraftComponentsInput } from './enrich-draft-components-input'
import type { EnrichDraftComponentsResult } from './enrich-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { ConnectionTimings } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-values'
import { DraftComponentsLoadError } from '../data-access/riviere-project/draft-components-load-error'
import type { StartConnectionDetectionTimer } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/connection-detection-timer'

/** @riviere-role command-use-case */
export class EnrichDraftComponents {
  constructor(
    private readonly riviereProjectRepository: RiviereProjectRepository,
    private readonly startConnectionDetectionTimer: StartConnectionDetectionTimer,
  ) {}

  execute(enrichDraftComponentsInput: EnrichDraftComponentsInput): EnrichDraftComponentsResult {
    try {
      const riviereProject = this.riviereProjectRepository.load({
        kind: 'extraction',
        projectRoot: enrichDraftComponentsInput.projectRoot ?? process.cwd(),
        configPath: enrichDraftComponentsInput.configPath,
        draftComponentsPath: enrichDraftComponentsInput.draftComponentsPath,
        useTsConfig: enrichDraftComponentsInput.useTsConfig,
      })

      const timing = this.startConnectionDetectionTimer()
      const result = riviereProject.enrichDraftComponents({
        allowIncomplete: enrichDraftComponentsInput.allowIncomplete,
        includeConnections: enrichDraftComponentsInput.includeConnections,
        observeConnectionDetectionPhase: timing.observe,
      })
      return {
        result:
          result.kind === 'full'
            ? {
                ...result,
                timings: [ConnectionTimings.parse(timing.phaseDurationsInMilliseconds())],
              }
            : result,
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
      if (error instanceof DraftComponentsLoadError) {
        return { result: { kind: 'draftComponentsFailure', message: error.message } }
      }
      throw error
    }
  }
}
