import { Command } from 'commander'
import {
  validateFlagCombinations,
  type ExtractOptions,
} from '../../../platform/infra/cli/input/extract-validator'
import { runExtraction } from '../commands/run-extraction'
import { presentExtractionResult } from '../infra/cli/output/present-extraction-result'

/** @riviere-role cli-entrypoint */
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

      const result = runExtraction({
        configPath: options.config,
        ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
        ...(options.componentsOnly === undefined ? {} : { componentsOnly: options.componentsOnly }),
        ...(options.enrich === undefined ? {} : { enrich: options.enrich }),
        ...(options.allowIncomplete === undefined
          ? {}
          : { allowIncomplete: options.allowIncomplete }),
        ...(options.pr === undefined ? {} : { pr: options.pr }),
        ...(options.base === undefined ? {} : { base: options.base }),
        ...(options.files === undefined ? {} : { files: options.files }),
        ...(options.format === undefined ? {} : { format: options.format }),
        ...(options.tsConfig === undefined ? {} : { tsConfig: options.tsConfig }),
      })
      presentExtractionResult(result, options)
    })
}
