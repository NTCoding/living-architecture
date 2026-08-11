import { ComponentSearchLoader } from '../data-access/query-loaders'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class SearchComponents {
  constructor(private readonly components: ComponentSearchLoader) {}

  execute(input: SearchComponentsInput): SearchComponentsResult {
    try {
      return this.components.load(input.graphPathOption, input.term)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
