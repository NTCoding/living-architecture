import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'

/** @riviere-role command-use-case */
export async function searchComponents(
  input: SearchComponentsInput,
): Promise<SearchComponentsResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
  }

  return {
    components: loadedGraph.query.search(input.term),
  }
}
