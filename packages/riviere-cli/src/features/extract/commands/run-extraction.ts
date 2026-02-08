import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import { formatPrMarkdown } from '../../../platform/infra/cli-presentation/format-pr-markdown'
import { formatDryRunOutput } from '../../../platform/infra/cli-presentation/extract-output-formatter'
import { outputResult } from '../../../platform/infra/cli-presentation/output-writer'
import {
  countLinksByType,
  formatExtractionStats,
} from '../../../platform/infra/cli-presentation/format-extraction-stats'
import type { ExtractOptions } from '../../../platform/infra/cli-presentation/extract-validator'
import {
  loadOrExtractComponents,
  enrichComponentsSafe,
  detectConnectionsSafe,
} from '../infra/safe-extraction-operations'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import { loadExtractionProject } from '../infra/load-extraction-project'
import { categorizeComponents } from '../../../platform/infra/cli-presentation/categorize-components'

export function runExtraction(
  options: ExtractOptions,
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  sourceFilePaths: string[],
): void {
  const project = loadExtractionProject(configDir, sourceFilePaths, options.tsConfig === false)

  const draftComponents = loadOrExtractComponents(
    project,
    sourceFilePaths,
    resolvedConfig,
    configDir,
    options.enrich,
  )

  /* v8 ignore start -- @preserve: dry-run tested via CLI integration */
  if (options.dryRun) {
    for (const line of formatDryRunOutput(draftComponents)) {
      console.log(line)
    }
    return
  }
  /* v8 ignore stop */

  if (options.format === 'markdown') {
    const categorized = categorizeComponents(draftComponents, undefined)
    const markdown = formatPrMarkdown(categorized)
    console.log(markdown)
    return
  }

  if (options.componentsOnly) {
    outputResult(formatSuccess(draftComponents), options)
    return
  }

  const enrichmentResult = enrichComponentsSafe(
    draftComponents,
    resolvedConfig,
    project,
    configDir,
    options.allowIncomplete === true,
  )

  const repositoryInfo = getRepositoryInfo()

  const { links } = detectConnectionsSafe(
    project,
    enrichmentResult.components,
    resolvedConfig.modules.map((m) => m.path),
    repositoryInfo.name,
    options.allowIncomplete === true,
    options.stats === true,
  )
  if (options.stats === true) {
    const stats = countLinksByType(enrichmentResult.components.length, links)
    for (const line of formatExtractionStats(stats)) {
      console.error(line)
    }
  }

  const outputOptions = options.output === undefined ? {} : { output: options.output }
  outputResult(
    formatSuccess({
      components: enrichmentResult.components,
      links,
    }),
    outputOptions,
  )
}
