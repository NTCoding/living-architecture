import { EntryPointListLoader } from '../data-access/graph/query-loaders'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListEntryPoints {
  constructor(private readonly entryPoints: EntryPointListLoader) {}

  execute(input: ListEntryPointsInput): ListEntryPointsResult {
    try {
      return this.entryPoints.load(input.graphPathOption)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
