import { ComponentListLoader } from '../data-access/query-loaders'
import { ComponentType } from '../../../platform/domain/component-type'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly components: ComponentListLoader) {}

  execute(input: ListComponentsInput): ListComponentsResult {
    const componentType = input.type === undefined ? undefined : ComponentType.parse(input.type)
    if (componentType !== undefined && !componentType.success) {
      return {
        kind: 'invalidComponentType',
        message: `Invalid component type: ${input.type}`,
      }
    }

    try {
      return this.components.load(input.graphPathOption, input.domain, componentType?.data.value)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
