import { RiviereQuery } from '@living-architecture/riviere-query'
import { getDefaultGraphPathDescription } from '../../../../platform/infra/cli/presentation/graph-path-option'
import { formatError } from '../../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../../platform/infra/cli/presentation/error-codes'
import { RiviereQueryRepository } from './riviere-query-repository'

export { getDefaultGraphPathDescription }

export interface LoadGraphResult {
  query: RiviereQuery
  graphPath: string
}

export interface LoadGraphError {
  error: ReturnType<typeof formatError>
}

export function isLoadGraphError(
  result: LoadGraphResult | LoadGraphError,
): result is LoadGraphError {
  return 'error' in result
}

export async function loadGraph(
  graphPathOption?: string,
): Promise<LoadGraphResult | LoadGraphError> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(graphPathOption)

  if (!loadedGraph.success && loadedGraph.code === 'GRAPH_NOT_FOUND') {
    return {
      error: formatError(
        CliErrorCode.GraphNotFound,
        `Graph not found at ${loadedGraph.graphPath}`,
        ['Run riviere builder init first'],
      ),
    }
  }

  if (!loadedGraph.success) {
    return {
      error: formatError(
        CliErrorCode.GraphCorrupted,
        `Graph file at ${loadedGraph.graphPath} is not valid JSON`,
        [
          'Check that the graph file contains valid JSON',
          'Try running riviere builder init to create a new graph',
        ],
      ),
    }
  }

  return {
    query: loadedGraph.query,
    graphPath: loadedGraph.graphPath,
  }
}

export async function withGraph(
  graphPathOption: string | undefined,
  handler: (query: RiviereQuery) => Promise<void> | void,
): Promise<void> {
  const result = await loadGraph(graphPathOption)

  if (isLoadGraphError(result)) {
    console.log(JSON.stringify(result.error))
    return
  }

  await handler(result.query)
}
