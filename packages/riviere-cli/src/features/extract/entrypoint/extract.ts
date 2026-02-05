import { Command } from 'commander'
import { Project } from 'ts-morph'
import {
  extractComponents,
  enrichComponents,
  matchesGlob,
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
} from '../../../platform/infra/cli-presentation/exit-handlers'
import { validateFlagCombinations } from '../../../platform/infra/cli-presentation/extract-validator'
import { detectAndOutputConnections } from '../commands/detect-and-output-connections'

interface ExtractOptions {
  config: string
  dryRun?: boolean
  output?: string
  componentsOnly?: boolean
  enrich?: string
  allowIncomplete?: boolean
  pr?: boolean
  base?: string
  files?: string[]
  format?: string
  stats?: boolean
  patterns?: boolean
}

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
    .action((options: ExtractOptions) => {
      validateFlagCombinations(options)

      const {
        resolvedConfig, configDir 
      } = loadAndValidateConfig(options.config)
      const allSourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
      const sourceFilePaths = resolveFilteredSourceFiles(allSourceFilePaths, options)
      const project = new Project()
      project.addSourceFilesAtPaths(sourceFilePaths)

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
        const lines = formatDryRunOutput(draftComponents)
        for (const line of lines) {
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

      const hasFailures = enrichmentResult.failures.length > 0
      if (hasFailures && options.allowIncomplete !== true) {
        exitWithExtractionFailure(enrichmentResult.failures.map((f) => f.field))
      }

      detectAndOutputConnections(project, enrichmentResult.components, {
        allowIncomplete: options.allowIncomplete === true,
        moduleGlobs: resolvedConfig.modules.map((m) => m.path),
        stats: options.stats === true,
        output: options.output,
      })
    })
}
