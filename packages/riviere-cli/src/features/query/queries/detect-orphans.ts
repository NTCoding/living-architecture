import { RiviereQueryRepository } from '../data-access/riviere-query-repository'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class DetectOrphans {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: DetectOrphansInput): DetectOrphansResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }
    return { orphans: loaded.query.detectOrphans() }
  }
}
