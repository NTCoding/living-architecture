import {
  type CliErrorCode, ExitCode 
} from './error-codes'
import { formatError } from './output'

export function exitWithCliError(code: CliErrorCode, message: string, exitCode: ExitCode): never {
  console.log(JSON.stringify(formatError(code, message)))
  process.exit(exitCode)
}
