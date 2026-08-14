import { formatError } from '../infra/cli/presentation/output'
import { ExitCode, ConfigValidationError } from '../infra/cli/presentation/error-codes'

/** @riviere-role cli-error-handler */
export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    console.log(JSON.stringify(formatError(error.errorCode, error.message)))
    process.exit(ExitCode.ConfigValidation)
  }

  throw error
}
