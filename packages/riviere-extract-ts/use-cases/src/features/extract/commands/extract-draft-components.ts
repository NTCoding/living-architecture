import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import type { ExtractDraftComponentsInput } from './extract-draft-components-input'
import type { ExtractDraftComponentsResult } from './extract-draft-components-result'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import type { FindChangedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-changed-source-files'
import type { FindSpecifiedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-specified-source-files'
import { resolveSourceFileSelection } from '@living-architecture/riviere-extract-ts-domain-model/domain/resolve-source-file-selection'
import { ConnectionTimings } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-values'
import type { ObserveConnectionDetectionPhase } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/observe-connection-detection-phase'

type ConnectionDetectionPhase = Parameters<ObserveConnectionDetectionPhase>[0]['phase']

/** @riviere-role command-use-case */
export class ExtractDraftComponents {
  constructor(
    private readonly riviereProjectRepository: RiviereProjectRepository,
    private readonly findChangedSourceFiles: FindChangedSourceFiles,
    private readonly findSpecifiedSourceFiles: FindSpecifiedSourceFiles,
    private readonly now: () => number,
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

      const timing = measureConnectionDetection(this.now)
      const result = riviereProject.extractDraftComponents({
        sourceFileSelection: selection.sourceFileSelection,
        allowIncomplete: extractDraftComponentsInput.allowIncomplete,
        includeConnections: extractDraftComponentsInput.includeConnections,
        observeConnectionDetectionPhase: timing.observe,
      })
      return {
        result: result.kind === 'full' ? { ...result, timings: [timing.result()] } : result,
        warnings: selection.warnings,
        ...(extractDraftComponentsInput.output === undefined
          ? {}
          : { outputPath: extractDraftComponentsInput.output }),
      }
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

function measureConnectionDetection(now: () => number) {
  const startedAt = new Map<ConnectionDetectionPhase, number>()
  const durationMs = new Map<ConnectionDetectionPhase, number>()
  const observe: ObserveConnectionDetectionPhase = (event) => {
    if (event.status === 'started') {
      startedAt.set(event.phase, now())
      return
    }
    const started = startedAt.get(event.phase)
    if (started !== undefined) durationMs.set(event.phase, now() - started)
  }
  return {
    observe,
    result: () =>
      ConnectionTimings.parse({
        setupMs: durationMs.get('setup') ?? 0,
        callGraphMs: durationMs.get('callGraph') ?? 0,
        asyncDetectionMs: durationMs.get('detection') ?? 0,
        totalMs: durationMs.get('total') ?? 0,
      }),
  }
}

function loadProjectFromInput(
  riviereProjectRepository: RiviereProjectRepository,
  extractDraftComponentsInput: ExtractDraftComponentsInput,
) {
  return riviereProjectRepository.loadByExtractionConfigPath({
    projectRoot: extractDraftComponentsInput.projectRoot ?? process.cwd(),
    configPath: extractDraftComponentsInput.configPath,
    useTsConfig: extractDraftComponentsInput.useTsConfig,
  })
}
