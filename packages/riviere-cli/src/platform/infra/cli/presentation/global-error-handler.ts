import { formatError } from './output'
import { CliErrorCode, ExitCode, ConfigValidationError } from './error-codes'
import { GitError } from '../../external-clients/git/git-errors'
import { DraftComponentLoadError } from '../../extraction-config/draft-component-loader'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts'

/** @riviere-role cli-output-formatter */
export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    console.log(JSON.stringify(formatError(error.errorCode, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  if (error instanceof GitError) {
    const code =
      error.gitErrorCode === 'NOT_A_REPOSITORY'
        ? CliErrorCode.GitNotARepository
        : error.gitErrorCode === 'GIT_NOT_FOUND'
          ? CliErrorCode.GitNotFound
          : CliErrorCode.ValidationError
    console.log(JSON.stringify(formatError(code, error.message)))
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

  throw error
}
