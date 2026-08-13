import { formatError } from '../platform/infra/cli/presentation/output'
import {
  CliErrorCode,
  ExitCode,
  ConfigValidationError,
} from '../platform/infra/cli/presentation/error-codes'
import { GitError } from '../platform/infra/external-clients/git/git-errors'
import { FileReadError } from '../platform/infra/external-clients/filesystem/file-reader'

/** @riviere-role cli-error-handler */
export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    console.log(JSON.stringify(formatError(error.errorCode, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  if (error instanceof GitError) {
    const code = getGitCliErrorCode(error.gitErrorCode)

    console.log(JSON.stringify(formatError(code, error.message)))
    process.exit(ExitCode.RuntimeError)
  }

  if (error instanceof FileReadError) {
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message)))
    process.exit(ExitCode.RuntimeError)
  }

  throw error
}

function getGitCliErrorCode(gitErrorCode: GitError['gitErrorCode']): CliErrorCode {
  switch (gitErrorCode) {
    case 'NOT_A_REPOSITORY':
      return CliErrorCode.GitNotARepository
    case 'GIT_NOT_FOUND':
      return CliErrorCode.GitNotFound
    default:
      return CliErrorCode.ValidationError
  }
}
