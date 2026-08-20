import { Command } from 'commander'
import { CliErrorCode, ExitCode } from '../../../../infra/cli/presentation/error-codes'
import { exitWithCliError } from '../../../../infra/cli/presentation/exit-with-cli-error'
import { parseFlagCombinations } from './parse-flag-combinations'
import type { EnrichDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components'
import type { ExtractDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'
import { createEnrichDraftComponentsInput } from './create-enrich-draft-components-input'
import {
  dataAccessCliErrorCode,
  presentExtractionResult,
  presentExtractionWarnings,
} from './present-extraction-result'
import { parseSourceFileSelection } from './parse-source-file-selection'

type ExtractCommandOptions = Parameters<typeof parseFlagCombinations>[0]

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateExtractCommandEntrypointDependencies {
  readonly extractDraftComponents: Pick<ExtractDraftComponents, 'execute'>
  readonly enrichDraftComponents: Pick<EnrichDraftComponents, 'execute'>
  readonly parseFlagCombinations: typeof parseFlagCombinations
  readonly createExtractDraftComponentsInput: typeof createExtractDraftComponentsInput
  readonly createEnrichDraftComponentsInput: typeof createEnrichDraftComponentsInput
  readonly exitWithCliError: typeof exitWithCliError
  readonly dataAccessCliErrorCode: typeof dataAccessCliErrorCode
  readonly presentExtractionResult: typeof presentExtractionResult
  readonly presentExtractionWarnings: typeof presentExtractionWarnings
  readonly parseSourceFileSelection: typeof parseSourceFileSelection
}
/** @riviere-role cli-entrypoint */
export function createExtractCommand(
  dependencies: CreateExtractCommandEntrypointDependencies,
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
    .option('--no-ts-config', 'Skip tsconfig.json auto-discovery (disables full type resolution)')
    .action((options: ExtractCommandOptions) => {
      dependencies.parseFlagCombinations(options)
      const result = (() => {
        try {
          return options.enrich === undefined
            ? dependencies.extractDraftComponents.execute(
                dependencies.createExtractDraftComponentsInput(
                  options,
                  dependencies.parseSourceFileSelection(options),
                ),
              )
            : dependencies.enrichDraftComponents.execute(
                dependencies.createEnrichDraftComponentsInput(options, options.enrich),
              )
        } catch (error) {
          if (!(error instanceof Error)) throw error
          if (error.name === 'GitError') {
            dependencies.exitWithCliError(
              CliErrorCode.GitNotARepository,
              error.message,
              ExitCode.RuntimeError,
              [],
            )
          }
          if (
            error.name === 'InvalidExtractInputError' ||
            error.name === 'InvalidEnrichInputError'
          ) {
            dependencies.exitWithCliError(
              CliErrorCode.ValidationError,
              error.message,
              ExitCode.ConfigValidation,
              [],
            )
          }
          throw error
        }
      })()
      if (result.result.kind === 'fieldFailure') {
        dependencies.exitWithCliError(
          CliErrorCode.ValidationError,
          `Extraction failed for fields: ${result.result.failedFields.join(', ')}`,
          ExitCode.ExtractionFailure,
          [],
        )
      }
      if (result.result.kind === 'draftComponentsFailure') {
        dependencies.exitWithCliError(
          CliErrorCode.ValidationError,
          result.result.message,
          ExitCode.ConfigValidation,
          [],
        )
      }
      if (result.result.kind === 'configFailure') {
        dependencies.exitWithCliError(
          result.result.code === 'CONFIG_NOT_FOUND'
            ? CliErrorCode.ConfigNotFound
            : CliErrorCode.ValidationError,
          result.result.message,
          ExitCode.ConfigValidation,
          [],
        )
      }
      if (result.result.kind === 'connectionDetectionFailure') {
        dependencies.exitWithCliError(
          CliErrorCode.ConnectionDetectionFailure,
          result.result.message,
          ExitCode.ExtractionFailure,
          ['Use --allow-incomplete to emit uncertain links instead of failing'],
        )
      }
      if (result.result.kind === 'dataAccessFailure') {
        dependencies.exitWithCliError(
          dependencies.dataAccessCliErrorCode(result.result.code),
          result.result.message,
          ExitCode.RuntimeError,
          [],
        )
      }

      if ('warnings' in result) dependencies.presentExtractionWarnings(result.warnings)
      dependencies.presentExtractionResult(result, options)
    })
}
