import { CliErrorCode } from './error-codes'
import { exitWithConfigValidation } from './exit-handlers'

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
}

function rejectMutuallyExclusive(
  flagA: string,
  flagB: string,
  aPresent: boolean,
  bPresent: boolean,
): void {
  if (aPresent && bPresent) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `${flagA} and ${flagB} cannot be used together`,
    )
  }
}

function validateMutualExclusions(options: ExtractOptions): void {
  rejectMutuallyExclusive(
    '--components-only',
    '--enrich',
    options.componentsOnly === true,
    options.enrich !== undefined,
  )
  rejectMutuallyExclusive('--pr', '--files', options.pr === true, options.files !== undefined)
  rejectMutuallyExclusive('--pr', '--enrich', options.pr === true, options.enrich !== undefined)
  rejectMutuallyExclusive(
    '--files',
    '--enrich',
    options.files !== undefined,
    options.enrich !== undefined,
  )
}

function validateFormatOption(options: ExtractOptions): void {
  if (options.format !== undefined && options.format !== 'json' && options.format !== 'markdown') {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid format '${options.format}'. Must be 'json' or 'markdown'.`,
    )
  }
  if (options.format === 'markdown' && !options.pr && options.files === undefined) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      '--format markdown requires --pr or --files',
    )
  }
}

export function validateFlagCombinations(options: ExtractOptions): void {
  validateMutualExclusions(options)
  if (options.base !== undefined && !options.pr) {
    exitWithConfigValidation(CliErrorCode.ValidationError, '--base can only be used with --pr')
  }
  validateFormatOption(options)
}
