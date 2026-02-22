import { Command } from 'commander'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../platform/infra/extraction-config/config-loader'
import { resolveFilteredSourceFiles } from '../../../platform/infra/source-filtering/filter-source-files'
import {
  validateFlagCombinations,
  type ExtractOptions,
} from '../../../platform/infra/cli-presentation/extract-validator'
import { runExtraction } from '../commands/run-extraction'
import { presentExtractionResult } from '../infra/mappers/present-extraction-result'

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

      const result = runExtraction(options, resolvedConfig, configDir, sourceFilePaths)
      presentExtractionResult(result, options)
    })
}
