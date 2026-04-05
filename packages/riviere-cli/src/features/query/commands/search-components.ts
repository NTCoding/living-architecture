import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'

/** @riviere-role command-use-case */
export function searchComponents(input: SearchComponentsInput): SearchComponentsResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)
  return { components: query.search(input.term) }
}
