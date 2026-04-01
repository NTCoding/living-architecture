import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListComponentsInput } from './list-components-input'
import type { ListComponentsResult } from './list-components-result'

/** @riviere-role command-use-case */
export async function listComponents(input: ListComponentsInput): Promise<ListComponentsResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
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
