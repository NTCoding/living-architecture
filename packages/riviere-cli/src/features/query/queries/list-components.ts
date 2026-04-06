import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'

/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListComponentsInput): ListComponentsResult {
    const query = this.repository.load(input.graphPathOption)

    const allComponents = query.components()
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
