import { OrphanListLoader } from '../data-access/query-loaders'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class DetectOrphans {
  constructor(private readonly orphans: OrphanListLoader) {}

  execute(input: DetectOrphansInput): DetectOrphansResult {
    try {
      return this.orphans.load(input.graphPathOption)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
