import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'

/** @riviere-role query-use-case */
export function listComponents(input: ListComponentsInput): ListComponentsResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)

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
