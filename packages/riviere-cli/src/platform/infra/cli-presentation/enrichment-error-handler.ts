import { InvalidEnrichmentTargetError } from '@living-architecture/riviere-builder'
import { handleComponentNotFoundError } from '../../../platform/infra/graph-persistence/builder-graph-loader'
import { formatError } from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'

export function handleEnrichmentError(error: unknown): void {
  if (error instanceof InvalidEnrichmentTargetError) {
    console.log(JSON.stringify(formatError(CliErrorCode.InvalidComponentType, error.message, [])))
    return
  }
  handleComponentNotFoundError(error)
}
