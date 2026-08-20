import { categorizeComponents } from './categorize-components'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from './format-extraction-stats'
import { formatDryRunOutput } from './extract-output-formatter'
import { formatPrMarkdown } from '../../../../infra/cli/presentation/format-pr-markdown'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { outputResult } from '../../../../infra/cli/presentation/output-writer'
import type { EnrichDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components-result'
import type { ExtractDraftComponentsResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-result'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'

type ExtractionResult =
  | ExtractDraftComponentsResult['result']
  | EnrichDraftComponentsResult['result']
type ExtractionPresentationOptions = {
  dryRun?: boolean
  format?: string
  output?: string
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
  result: ExtractionResult,
  options: ExtractionPresentationOptions,
): void {
  if (result.kind === 'draftOnly') {
    presentDraftResult(result.components, options)
    return
  }

  if (
    result.kind === 'fieldFailure' ||
    result.kind === 'configFailure' ||
    result.kind === 'dataAccessFailure' ||
    result.kind === 'connectionDetectionFailure'
  ) {
    return
  }

  presentFullResult(result, options)
}

function presentDraftResult(
  components: Extract<ExtractionResult, { kind: 'draftOnly' }>['components'],
  options: ExtractionPresentationOptions,
): void {
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

  outputResult(formatSuccess(components), createOutputOptions(options.output))
}

function presentFullResult(
  result: Extract<ExtractionResult, { kind: 'full' }>,
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

  outputResult(
    formatSuccess({
      components: result.components,
      links: result.links,
      externalLinks: result.externalLinks,
    }),
    createOutputOptions(options.output),
  )
}

function createOutputOptions(outputPath: string | undefined): { output?: string } {
  return outputPath === undefined ? {} : { output: outputPath }
}
