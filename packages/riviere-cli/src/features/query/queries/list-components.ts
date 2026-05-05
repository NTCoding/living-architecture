import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListComponentsInput): ListComponentsResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }

    const allComponents = loaded.query.components()
    const filteredByDomain =
      input.domain === undefined
        ? allComponents
        : allComponents.filter((component) => component.domain === input.domain)

    return {
      components:
        input.type === undefined
          ? filteredByDomain
          : filteredByDomain.filter((component) => component.type === input.type),
    }
  }
}
