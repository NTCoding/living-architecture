import { ComponentListLoader } from '../data-access/query-loaders'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly components: ComponentListLoader) {}

  execute(input: ListComponentsInput): ListComponentsResult {
    try {
      return this.components.load(input.graphPathOption, input.domain, input.type)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
