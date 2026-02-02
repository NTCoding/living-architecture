import { writeFileSync } from 'node:fs'
import {
  formatError, type SuccessOutput 
} from './output'
import {
  CliErrorCode, ExitCode 
} from './error-codes'

interface OutputOptions {output?: string}

export function outputResult<T>(data: SuccessOutput<T>, options: OutputOptions): void {
  if (options.output !== undefined) {
    try {
      writeFileSync(options.output, JSON.stringify(data))
    } catch {
      console.log(
        JSON.stringify(
          formatError(
            CliErrorCode.ValidationError,
            'Failed to write output file: ' + options.output,
          ),
        ),
      )
      process.exit(ExitCode.RuntimeError)
    }
    return
  }

  console.log(JSON.stringify(data))
}
