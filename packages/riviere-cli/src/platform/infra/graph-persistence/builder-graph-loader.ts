import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../../../features/builder/infra/persistence/riviere-builder-repository'
import { reportGraphNotFound } from '../cli/presentation/graph-error-output'

/** @riviere-role external-client-service */
export async function withGraphBuilder(
  graphPathOption: string | undefined,
  handler: (builder: RiviereBuilder, graphPath: string) => Promise<void>,
): Promise<void> {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = await repository.load(graphPathOption)

  if (!loadedGraph.success) {
    reportGraphNotFound(loadedGraph.graphPath)
    return
  }

  await handler(loadedGraph.builder, loadedGraph.graphPath)
}

/** @riviere-role external-client-service */
export async function initializeGraphBuilder(
  builder: RiviereBuilder,
  graphPathOption?: string,
): Promise<{ graphExists: boolean; graphPath: string }> {
  const repository = new RiviereBuilderRepository()
  const graphStatus = await repository.exists(graphPathOption)
  if (graphStatus.exists) {
    return {
      graphExists: true,
      graphPath: graphStatus.graphPath,
    }
  }

  const graphPath = await repository.save(builder, graphPathOption)
  return {
    graphExists: false,
    graphPath,
  }
}

/** @riviere-role external-client-service */
export async function saveGraphBuilder(
  builder: RiviereBuilder,
  graphPathOption?: string,
): Promise<string> {
  const repository = new RiviereBuilderRepository()
  return repository.save(builder, graphPathOption)
}
