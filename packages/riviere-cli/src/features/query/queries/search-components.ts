import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class SearchComponents {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: SearchComponentsInput): SearchComponentsResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }
    return { components: loaded.query.search(input.term) }
  }
}
