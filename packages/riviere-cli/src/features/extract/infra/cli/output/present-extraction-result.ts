import { categorizeComponents } from '../../../../../platform/infra/cli-presentation/categorize-components'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from '../../../../../platform/infra/cli-presentation/format-extraction-stats'
import { formatDryRunOutput } from '../../../../../platform/infra/cli-presentation/extract-output-formatter'
import { formatPrMarkdown } from '../../../../../platform/infra/cli-presentation/format-pr-markdown'
import { formatSuccess } from '../../../../../platform/infra/cli-presentation/output'
import { outputResult } from '../../../../../platform/infra/cli-presentation/output-writer'
import type { ExtractOptions } from '../../../../../platform/infra/cli-presentation/extract-validator'
import type { EnrichDraftComponentsResult } from '../../../commands/enrich-draft-components-result'
import type { ExtractDraftComponentsResult } from '../../../commands/extract-draft-components-result'

type ExtractionResult = ExtractDraftComponentsResult | EnrichDraftComponentsResult

/** @riviere-role cli-output-formatter */
export function presentExtractionResult(result: ExtractionResult, options: ExtractOptions): void {
  if (result.kind === 'draftOnly') {
    presentDraftResult(result.components, options)
    return
  }

  presentFullResult(result, options)
}

function presentDraftResult(
  components: Extract<ExtractionResult, { kind: 'draftOnly' }>['components'],
  options: ExtractOptions,
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
    const categorized = categorizeComponents(components, undefined)
    const markdown = formatPrMarkdown(categorized)
    console.log(markdown)
    return
  }

  outputResult(formatSuccess(components), createOutputOptions(options.output))
}

function presentFullResult(
  result: Extract<ExtractionResult, { kind: 'full' }>,
  options: ExtractOptions,
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
    }),
    createOutputOptions(options.output),
  )
}

function createOutputOptions(outputPath: string | undefined): { output?: string } {
  return outputPath === undefined ? {} : { output: outputPath }
}
