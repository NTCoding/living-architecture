import { Command } from 'commander'
import {
  extractComponents,
  enrichComponents,
  matchesGlob,
  detectConnections,
  ConnectionDetectionError,
} from '@living-architecture/riviere-extract-ts'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../platform/infra/extraction-config/config-loader'
import {
  loadDraftComponentsFromFile,
  DraftComponentLoadError,
} from '../../../platform/infra/extraction-config/draft-component-loader'
import { resolveFilteredSourceFiles } from '../../../platform/infra/source-filtering/filter-source-files'
import { formatPrMarkdown } from '../../../platform/infra/cli-presentation/format-pr-markdown'
import { formatDryRunOutput } from '../../../platform/infra/cli-presentation/extract-output-formatter'
import { outputResult } from '../../../platform/infra/cli-presentation/output-writer'
import {
  exitWithRuntimeError,
  exitWithExtractionFailure,
  exitWithConnectionDetectionFailure,
} from '../../../platform/infra/cli-presentation/exit-handlers'
import {
  validateFlagCombinations,
  type ExtractOptions,
} from '../../../platform/infra/cli-presentation/extract-validator'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from '../../../platform/infra/cli-presentation/format-extraction-stats'
import { loadExtractionProject } from '../queries/load-extraction-project'

export function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract architectural components from source code')
    .requiredOption('--config <path>', 'Path to extraction config file')
    .option('--dry-run', 'Show component counts per domain without full output')
    .option('-o, --output <file>', 'Write output to file instead of stdout')
    .option('--components-only', 'Output only component identity (no metadata enrichment)')
    .option('--enrich <file>', 'Read draft components from file and enrich with extraction rules')
    .option('--allow-incomplete', 'Output components even when some extraction fields fail')
    .option('--pr', 'Extract from files changed in current branch vs base branch')
    .option('--base <branch>', 'Override base branch for --pr (default: auto-detect)')
    .option('--files <paths...>', 'Extract from specific files')
    .option('--format <type>', 'Output format: json (default) or markdown')
    .option('--stats', 'Show extraction statistics on stderr')
    .option('--patterns', 'Enable pattern-based connection detection')
    .option('--no-ts-config', 'Skip tsconfig.json auto-discovery (disables full type resolution)')
    .action((options: ExtractOptions) => {
      validateFlagCombinations(options)

      const {
        resolvedConfig, configDir 
      } = loadAndValidateConfig(options.config)
      const allSourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
      const sourceFilePaths = resolveFilteredSourceFiles(allSourceFilePaths, options)
      const project = loadExtractionProject(configDir, sourceFilePaths, options.tsConfig === false)

      const draftComponents = (() => {
        if (options.enrich === undefined) {
          return extractComponents(project, sourceFilePaths, resolvedConfig, matchesGlob, configDir)
        }
        try {
          return loadDraftComponentsFromFile(options.enrich)
          /* v8 ignore start -- @preserve: DraftComponentLoadError handling; validation tested in draft-component-loader.spec.ts */
        } catch (error) {
          if (error instanceof DraftComponentLoadError) {
            exitWithRuntimeError(error.message)
          }
          throw error
        }
        /* v8 ignore stop */
      })()
      /* v8 ignore start -- @preserve: dry-run path tested via CLI integration */
      if (options.dryRun) {
        for (const line of formatDryRunOutput(draftComponents)) {
          console.log(line)
        }
        return
      }
      /* v8 ignore stop */
      if (options.format === 'markdown') {
        const markdown = formatPrMarkdown({
          added: draftComponents.map((c) => ({
            type: c.type,
            name: c.name,
            domain: c.domain,
          })),
          modified: [],
          removed: [],
        })
        console.log(markdown)
        return
      }

      if (options.componentsOnly) {
        outputResult(formatSuccess(draftComponents), options)
        return
      }

      const enrichmentResult = enrichComponents(
        draftComponents,
        resolvedConfig,
        project,
        matchesGlob,
        configDir,
      )
      if (enrichmentResult.failures.length > 0 && options.allowIncomplete !== true) {
        exitWithExtractionFailure(enrichmentResult.failures.map((f) => f.field))
      }

      const {
        links, timings 
      } = (() => {
        try {
          return detectConnections(
            project,
            enrichmentResult.components,
            {
              allowIncomplete: options.allowIncomplete === true,
              moduleGlobs: resolvedConfig.modules.map((m) => m.path),
            },
            matchesGlob,
          )
          /* v8 ignore start -- @preserve: ConnectionDetectionError tested via CLI integration in extract.connections.spec.ts */
        } catch (error) {
          if (error instanceof ConnectionDetectionError) {
            exitWithConnectionDetectionFailure(error.file, error.line, error.typeName, error.reason)
          }
          throw error
        }
        /* v8 ignore stop */
      })()
      console.error(formatTimingLine(timings))
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
    })
}
