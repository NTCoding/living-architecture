import {
  type CliErrorCode, ExitCode 
} from './error-codes'
import { formatError } from './output'

/** @riviere-role cli-output-formatter */
export function exitWithCliError(code: CliErrorCode, message: string, exitCode: ExitCode): never {
  console.log(JSON.stringify(formatError(code, message)))
  process.exit(exitCode)
}
