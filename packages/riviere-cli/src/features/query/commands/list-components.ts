import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'

/** @riviere-role command-use-case */
export function listComponents(input: ListComponentsInput): ListComponentsResult {
  const repository = new RiviereQueryRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw {
      ...loadedGraph,
      kind: 'QUERY_GRAPH_LOAD_ERROR' as const,
    }
  }

  const allComponents = loadedGraph.query.components()
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
