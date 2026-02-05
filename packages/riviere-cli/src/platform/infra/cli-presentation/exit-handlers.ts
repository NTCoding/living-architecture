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

/* v8 ignore start -- @preserve: called from ConnectionDetectionError catch; tested via CLI integration in extract.connections.spec.ts */
export function exitWithConnectionDetectionFailure(
  file: string,
  line: number,
  typeName: string,
  reason: string,
): never {
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.ConnectionDetectionFailure,
        `${file}:${line}: ${reason} — ${typeName}`,
        ['Use --allow-incomplete to emit uncertain links instead of failing'],
      ),
    ),
  )
  process.exit(ExitCode.ExtractionFailure)
}
/* v8 ignore stop */
