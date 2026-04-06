import { Command } from 'commander'
import {
  CliErrorCode, ExitCode 
} from '../../../platform/infra/cli/presentation/error-codes'
import { exitWithCliError } from '../../../platform/infra/cli/presentation/exit-with-cli-error'
import { validateFlagCombinations } from '../../../platform/infra/cli/input/extract-validator'
import type { EnrichDraftComponents } from '../commands/enrich-draft-components'
import type { ExtractDraftComponents } from '../commands/extract-draft-components'
import { createExtractDraftComponentsInput } from '../commands/create-extract-draft-components-input'
import { createEnrichDraftComponentsInput } from '../commands/create-enrich-draft-components-input'
import { presentExtractionResult } from '../infra/cli/output/present-extraction-result'

/** @riviere-role cli-entrypoint */
export function createExtractCommand(
  extractDraftComponents: ExtractDraftComponents,
  enrichDraftComponents: EnrichDraftComponents,
): Command {
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
    .action(
      (options: {
        allowIncomplete?: boolean
        base?: string
        componentsOnly?: boolean
        config: string
        dryRun?: boolean
        enrich?: string
        files?: string[]
        format?: string
        output?: string
        patterns?: boolean
        pr?: boolean
        stats?: boolean
        tsConfig?: boolean
      }) => {
        validateFlagCombinations(options)

        const result =
          options.enrich === undefined
            ? extractDraftComponents.execute(createExtractDraftComponentsInput(options))
            : enrichDraftComponents.execute(
              createEnrichDraftComponentsInput(options, options.enrich),
            )

        if (result.kind === 'fieldFailure') {
          exitWithCliError(
            CliErrorCode.ValidationError,
            `Extraction failed for fields: ${result.failedFields.join(', ')}`,
            ExitCode.ExtractionFailure,
          )
        }

        presentExtractionResult(result, options)
      },
    )
}
