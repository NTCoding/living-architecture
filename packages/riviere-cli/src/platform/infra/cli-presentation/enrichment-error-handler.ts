import { InvalidEnrichmentTargetError } from '@living-architecture/riviere-builder'
import { handleComponentNotFoundError } from './graph-error-output'
import { formatError } from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'

/** @riviere-role cli-output-formatter */
export function handleEnrichmentError(error: unknown): void {
  if (error instanceof InvalidEnrichmentTargetError) {
    console.log(JSON.stringify(formatError(CliErrorCode.InvalidComponentType, error.message, [])))
    return
  }
  handleComponentNotFoundError(error)
}
