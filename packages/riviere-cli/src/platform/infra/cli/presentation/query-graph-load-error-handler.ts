import { CliErrorCode } from './error-codes'
import { formatError } from './output'

interface QueryGraphLoadError {
  code: 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'
  graphPath: string
  kind: 'QUERY_GRAPH_LOAD_ERROR'
}

/** @riviere-role cli-output-formatter */
export function handleQueryGraphLoadError(error: unknown): boolean {
  if (!isQueryGraphLoadError(error)) {
    return false
  }

  const message =
    error.code === 'GRAPH_NOT_FOUND'
      ? `Graph not found at ${error.graphPath}`
      : 'Graph file contains invalid JSON'
  const code =
    error.code === 'GRAPH_NOT_FOUND' ? CliErrorCode.GraphNotFound : CliErrorCode.GraphCorrupted

  console.log(JSON.stringify(formatError(code, message)))
  return true
}

function isQueryGraphLoadError(error: unknown): error is QueryGraphLoadError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'QUERY_GRAPH_LOAD_ERROR' &&
    'code' in error &&
    (error.code === 'GRAPH_NOT_FOUND' || error.code === 'GRAPH_CORRUPTED') &&
    'graphPath' in error &&
    typeof error.graphPath === 'string'
  )
}
