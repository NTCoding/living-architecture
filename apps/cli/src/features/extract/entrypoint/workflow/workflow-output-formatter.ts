import type { RunWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow-result'
import type { ValidateWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow-result'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { CliOutput } from '../../../../infra/cli/presentation/output-writer'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'

/** @riviere-role cli-output-formatter */
export function formatValidateWorkflowResult(result: ValidateWorkflowResult): CliOutput {
  if (result.result.success) return formatSuccess('Workflow is valid')
  return formatError(cliErrorCode(result.result.errorCode), result.result.reason)
}

/** @riviere-role cli-output-formatter */
export function formatRunWorkflowResult(result: RunWorkflowResult): CliOutput {
  if (!result.result.success) {
    return formatError(cliErrorCode(result.result.errorCode), result.result.reason)
  }
  return formatSuccess(`Workflow completed: ${result.result.outputPath}`)
}

function cliErrorCode(errorCode: string): CliErrorCode {
  switch (errorCode) {
    case CliErrorCode.AiCliUnavailable:
      return CliErrorCode.AiCliUnavailable
    case CliErrorCode.ValidationError:
      return CliErrorCode.ValidationError
    default:
      return CliErrorCode.RuntimeError
  }
}
