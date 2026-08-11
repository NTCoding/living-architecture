import { type CliErrorCode, ExitCode } from './error-codes'
import { formatError } from './output'

/** @riviere-role cli-response-writer */
export function exitWithCliError(
  code: CliErrorCode,
  message: string,
  exitCode: ExitCode,
  suggestions: string[],
): never {
  console.log(JSON.stringify(formatError(code, message, suggestions)))
  process.exit(exitCode)
}
