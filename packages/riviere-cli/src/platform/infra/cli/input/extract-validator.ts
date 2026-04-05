import {
  CliErrorCode, ConfigValidationError 
} from '../presentation/error-codes'

interface ExtractOptions {
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
}

function rejectMutuallyExclusive(
  flagA: string,
  flagB: string,
  aPresent: boolean,
  bPresent: boolean,
): void {
  if (aPresent && bPresent) {
    throw new ConfigValidationError(
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
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Invalid format '${options.format}'. Must be 'json' or 'markdown'.`,
    )
  }
  if (options.format === 'markdown' && !options.pr && options.files === undefined) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      '--format markdown requires --pr or --files',
    )
  }
}

/** @riviere-role cli-input-validator */
export function validateFlagCombinations(options: ExtractOptions): void {
  validateMutualExclusions(options)
  if (options.base !== undefined && !options.pr) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      '--base can only be used with --pr',
    )
  }
  validateFormatOption(options)
}
