import { GraphCorruptedError } from '../../../domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../domain/graph-not-found-error'
import { CliErrorCode } from './error-codes'
import { formatError } from './output'

/** @riviere-role cli-output-formatter */
export function handleQueryGraphLoadError(error: unknown): boolean {
  if (error instanceof GraphNotFoundError) {
    console.log(JSON.stringify(formatError(CliErrorCode.GraphNotFound, error.message)))
    return true
  }

  if (error instanceof GraphCorruptedError) {
    console.log(
      JSON.stringify(formatError(CliErrorCode.GraphCorrupted, 'Graph file contains invalid JSON')),
    )
    return true
  }

  return false
}
