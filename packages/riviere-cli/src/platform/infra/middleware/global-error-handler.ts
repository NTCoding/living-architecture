import { formatError } from '../cli/output/output'
import {
  ConfigValidationError, ExtractionFieldFailureError 
} from '../errors/errors'
import {
  CliErrorCode, ExitCode 
} from '../cli/output/error-codes'
import { GitError } from '../git/git-errors'
import { DraftComponentLoadError } from '../persistence/draft-component-store'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts'
import { SourceFilterError } from '../source-filtering/filter-source-files'

/** @riviere-role middleware */
export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    console.log(JSON.stringify(formatError(error.errorCode, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  if (isExtractionFieldFailureError(error)) {
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message)))
    process.exit(ExitCode.ExtractionFailure)
  }

  if (error instanceof GitError) {
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message)))
    process.exit(ExitCode.RuntimeError)
  }

  if (error instanceof DraftComponentLoadError) {
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message)))
    process.exit(ExitCode.RuntimeError)
  }

  if (error instanceof ConnectionDetectionError) {
    console.log(
      JSON.stringify(
        formatError(
          CliErrorCode.ConnectionDetectionFailure,
          `${error.file}:${error.line}: ${error.reason} — ${error.typeName}`,
          ['Use --allow-incomplete to emit uncertain links instead of failing'],
        ),
      ),
    )
    process.exit(ExitCode.ExtractionFailure)
  }

  if (error instanceof SourceFilterError) {
    if (error.filterErrorKind === 'GIT_ERROR' && error.gitError !== undefined) {
      const code =
        error.gitError.gitErrorCode === 'NOT_A_REPOSITORY'
          ? CliErrorCode.GitNotARepository
          : CliErrorCode.GitNotFound
      console.log(JSON.stringify(formatError(code, error.gitError.message)))
      process.exit(ExitCode.RuntimeError)
    }
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  throw error
}

/** @riviere-role middleware */
function isExtractionFieldFailureError(error: unknown): error is ExtractionFieldFailureError {
  if (error instanceof ExtractionFieldFailureError) {
    return true
  }

  return error instanceof Error && error.name === 'ExtractionFieldFailureError'
}
