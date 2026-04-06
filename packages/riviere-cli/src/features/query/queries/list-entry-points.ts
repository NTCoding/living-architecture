import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'

/** @riviere-role query-model-use-case */
export class ListEntryPoints {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListEntryPointsInput): ListEntryPointsResult {
    const query = this.repository.load(input.graphPathOption)
    return { entryPoints: query.entryPoints() }
  }
}
