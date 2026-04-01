import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'

/** @riviere-role command-use-case */
export async function listEntryPoints(input: ListEntryPointsInput): Promise<ListEntryPointsResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
  }

  return {
    entryPoints: loadedGraph.query.entryPoints(),
  }
}
