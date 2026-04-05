import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'

/** @riviere-role query-use-case */
export function listEntryPoints(input: ListEntryPointsInput): ListEntryPointsResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)
  return { entryPoints: query.entryPoints() }
}
