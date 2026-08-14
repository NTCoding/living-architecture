import { CliErrorCode } from './error-codes'
import { formatError } from './output'

interface QueryGraphLoadFailureOutput {
  readonly kind: 'graphCorrupted' | 'graphNotFound'
  readonly message: string
}

/** @riviere-role cli-output-formatter */
export function formatQueryGraphLoadFailure(
  failure: QueryGraphLoadFailureOutput,
): ReturnType<typeof formatError> {
  const code =
    failure.kind === 'graphNotFound' ? CliErrorCode.GraphNotFound : CliErrorCode.GraphCorrupted
  return formatError(code, failure.message)
}
