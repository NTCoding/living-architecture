import { writeFileSync } from 'node:fs'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode, ExitCode } from '../../../../infra/cli/presentation/error-codes'
import type { EnrichDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-result'
import type { ExtractDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-result'

/** @riviere-role cli-response-writer */
export function outputExtractDraftComponentsResult(
  commandResult: ExtractDraftComponentsResult,
): void {
  outputResult(commandResult)
}

/** @riviere-role cli-response-writer */
export function outputEnrichDraftComponentsResult(
  commandResult: EnrichDraftComponentsResult,
): void {
  outputResult(commandResult)
}

function outputResult(
  commandResult: ExtractDraftComponentsResult | EnrichDraftComponentsResult,
): void {
  if (commandResult.result.kind !== 'draftOnly' && commandResult.result.kind !== 'full') return

  const data =
    commandResult.result.kind === 'draftOnly'
      ? formatSuccess(commandResult.result.components)
      : formatSuccess({
          components: commandResult.result.components,
          links: commandResult.result.links,
          externalLinks: commandResult.result.externalLinks,
        })

  if (commandResult.outputPath !== undefined) {
    try {
      writeFileSync(commandResult.outputPath, JSON.stringify(data))
    } catch {
      console.log(
        JSON.stringify(
          formatError(
            CliErrorCode.ValidationError,
            'Failed to write output file: ' + commandResult.outputPath,
          ),
        ),
      )
      process.exit(ExitCode.RuntimeError)
    }
    return
  }

  console.log(JSON.stringify(data))
}
