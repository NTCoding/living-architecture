import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'

/** @riviere-role command-use-case */
export async function detectOrphans(input: DetectOrphansInput): Promise<DetectOrphansResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
  }

  return {
    orphans: loadedGraph.query.detectOrphans(),
  }
}
