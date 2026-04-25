import { writeFileSync } from 'node:fs'
import { formatError } from './output'
import {
  CliErrorCode, ExitCode 
} from './error-codes'

interface OutputOptions {output?: string}

/** @riviere-role cli-output-formatter */
export function outputResult<T>(
  successPayload: {
    success: true
    data: T
    warnings: string[]
  },
  options: OutputOptions,
): void {
  if (options.output !== undefined) {
    try {
      writeFileSync(options.output, JSON.stringify(successPayload))
    } catch (error) {
      console.log(
        JSON.stringify(
          formatError(
            CliErrorCode.ValidationError,
            buildWriteFailureMessage(options.output, error),
          ),
        ),
      )
      process.exit(ExitCode.RuntimeError)
    }
    return
  }

  console.log(JSON.stringify(successPayload))
}

function buildWriteFailureMessage(outputPath: string, error: unknown): string {
  return `Failed to write output file: ${outputPath}. ${readErrorMessage(error)}`
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
