import { RiviereQueryRepository } from '../data-access/riviere-query-repository'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListEntryPoints {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListEntryPointsInput): ListEntryPointsResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }
    return { entryPoints: loaded.query.entryPoints() }
  }
}
