import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { reportGraphNotFound } from '../../../../platform/infra/cli/presentation/graph-error-output'
import { RiviereBuilderRepository } from './riviere-builder-repository'

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

export async function saveGraphBuilder(
  builder: RiviereBuilder,
  graphPathOption?: string,
): Promise<string> {
  const repository = new RiviereBuilderRepository()
  return repository.save(builder, graphPathOption)
}
