import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'

/** @riviere-role query-model-use-case */
export class DetectOrphans {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: DetectOrphansInput): DetectOrphansResult {
    const query = this.repository.load(input.graphPathOption)
    return { orphans: query.detectOrphans() }
  }
}
