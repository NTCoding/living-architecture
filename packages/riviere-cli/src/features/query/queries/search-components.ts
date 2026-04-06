import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'

/** @riviere-role query-model-use-case */
export class SearchComponents {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: SearchComponentsInput): SearchComponentsResult {
    const query = this.repository.load(input.graphPathOption)
    return { components: query.search(input.term) }
  }
}
