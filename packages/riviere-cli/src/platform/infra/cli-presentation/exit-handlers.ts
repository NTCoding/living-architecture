import { formatError } from './output'
import {
  CliErrorCode, ExitCode 
} from './error-codes'

/* v8 ignore start -- @preserve: called from DraftComponentLoadError catch; validation logic tested in draft-component-loader.spec.ts */
export function exitWithRuntimeError(message: string): never {
  console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, message)))
  process.exit(ExitCode.RuntimeError)
}
/* v8 ignore stop */

export function exitWithConfigValidation(code: CliErrorCode, message: string): never {
  console.log(JSON.stringify(formatError(code, message)))
  process.exit(ExitCode.ConfigValidation)
}

export function exitWithExtractionFailure(fieldNames: string[]): never {
  const uniqueFields = [...new Set(fieldNames)]
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Extraction failed for fields: ${uniqueFields.join(', ')}`,
      ),
    ),
  )
  process.exit(ExitCode.ExtractionFailure)
}
