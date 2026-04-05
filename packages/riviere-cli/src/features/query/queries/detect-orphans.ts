import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'

/** @riviere-role query-use-case */
export function detectOrphans(input: DetectOrphansInput): DetectOrphansResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)
  return { orphans: query.detectOrphans() }
}
