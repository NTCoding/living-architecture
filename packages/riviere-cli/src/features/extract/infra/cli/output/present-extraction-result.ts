import { formatSuccess } from '../../../../../platform/infra/cli/output/output'
import { formatPrMarkdown } from '../../../../../platform/infra/cli/output/format-pr-markdown'
import { formatDryRunOutput } from '../../../../../platform/infra/cli/output/extract-output-formatter'
import { outputResult } from '../../../../../platform/infra/cli/output/output-writer'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from '../../../../../platform/infra/cli/output/format-extraction-stats'
import { categorizeComponents } from '../../../../../platform/infra/cli/output/categorize-components'
import type { ExtractionResult } from '../../../domain/extraction-result'
import type { ExtractOptions } from '../../../../../platform/infra/cli/input/extract-validator'

/** @riviere-role cli-output-writer */
export function presentExtractionResult(result: ExtractionResult, options: ExtractOptions): void {
  if (result.kind === 'draftOnly') {
    presentDraftResult(result.components, options)
    return
  }

  presentFullResult(result, options)
}

/** @riviere-role cli-output-writer */
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

  outputResult(formatSuccess(components), { output: options.output })
}

/** @riviere-role cli-output-writer */
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
    { output: options.output },
  )
}
