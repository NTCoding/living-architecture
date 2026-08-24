import { categorizeComponents } from './categorize-components'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from './format-extraction-stats'
import { formatDryRunOutput } from './extract-output-formatter'
import { formatPrMarkdown } from '../../../../infra/cli/presentation/format-pr-markdown'
import {
  outputEnrichDraftComponentsResult,
  outputExtractDraftComponentsResult,
} from './output-writer'
import type { EnrichDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-result'
import type { ExtractDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-result'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'

type ExtractionCommandResult = ExtractDraftComponentsResult | EnrichDraftComponentsResult
type ExtractionResult = ExtractionCommandResult['result']
type ExtractionPresentationOptions = {
  dryRun?: boolean
  format?: string
  stats?: boolean
}

/** @riviere-role cli-output-formatter */
export function dataAccessCliErrorCode(
  code: Extract<ExtractDraftComponentsResult['result'], { kind: 'dataAccessFailure' }>['code'],
): CliErrorCode {
  switch (code) {
    case 'GIT_NOT_FOUND':
      return CliErrorCode.GitNotFound
    case 'NOT_A_REPOSITORY':
      return CliErrorCode.GitNotARepository
    default:
      return CliErrorCode.ValidationError
  }
}

/** @riviere-role cli-output-formatter */
export function presentExtractionWarnings(warnings: readonly string[]): void {
  for (const warning of warnings) console.error(warning)
}

/** @riviere-role cli-output-formatter */
export function presentExtractionResult(
  commandResult: ExtractionCommandResult,
  options: ExtractionPresentationOptions,
): void {
  const result = commandResult.result
  if (result.kind === 'draftOnly') {
    presentDraftResult(result, commandResult, options)
    return
  }

  if (
    result.kind === 'fieldFailure' ||
    result.kind === 'draftComponentsFailure' ||
    result.kind === 'configFailure' ||
    result.kind === 'dataAccessFailure' ||
    result.kind === 'connectionDetectionFailure'
  ) {
    return
  }

  presentFullResult(result, commandResult, options)
}

function presentDraftResult(
  result: Extract<ExtractionResult, { kind: 'draftOnly' }>,
  commandResult: ExtractionCommandResult,
  options: ExtractionPresentationOptions,
): void {
  const { components } = result
  /* v8 ignore start -- @preserve: dry-run tested via CLI integration */
  if (options.dryRun) {
    for (const line of formatDryRunOutput(components)) {
      console.log(line)
    }
    return
  }
  /* v8 ignore stop */

  if (options.format === 'markdown') {
    const markdown = formatPrMarkdown(categorizeComponents(components, undefined))
    console.log(markdown)
    return
  }

  outputExtractionResult(commandResult)
}

function presentFullResult(
  result: Extract<ExtractionResult, { kind: 'full' }>,
  commandResult: ExtractionCommandResult,
  options: ExtractionPresentationOptions,
): void {
  if (result.failedFields.length > 0) {
    console.error(
      `Warning: Enrichment failed for ${result.failedFields.length} field(s): ${result.failedFields.join(', ')}`,
    )
  }

  if (options.stats === true) {
    for (const timing of result.timings) {
      console.error(formatTimingLine(timing))
    }
    const stats = countLinksByType(result.components.length, result.links)
    for (const line of formatExtractionStats(stats)) {
      console.error(line)
    }
  }

  outputExtractionResult(commandResult)
}

function outputExtractionResult(commandResult: ExtractionCommandResult): void {
  if ('warnings' in commandResult) {
    outputExtractDraftComponentsResult(commandResult)
    return
  }
  outputEnrichDraftComponentsResult(commandResult)
}
