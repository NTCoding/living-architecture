import { formatError } from './output'
import {
  CliErrorCode,
  ExitCode,
  ConfigValidationError,
  ExtractionFieldFailureError,
} from './error-codes'
import { GitError } from '../git/git-errors'
import { DraftComponentLoadError } from '../extraction-config/draft-component-loader'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts'
import { SourceFilterError } from '../source-filtering/filter-source-files'

export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    console.log(JSON.stringify(formatError(error.errorCode, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  if (error instanceof ExtractionFieldFailureError) {
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
