import { ComponentSummaryLoader } from '../data-access/graph/query-loaders'
import { GraphCorruptedError } from '../data-access/graph/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/graph/graph-not-found-error'
import type { ComponentSummaryInput } from './component-summary-input'
import { type ComponentSummaryErrorCode, ComponentSummaryResult } from './component-summary-result'

/** @riviere-role query-model-use-case */
export class ComponentSummary {
  constructor(private readonly summary: ComponentSummaryLoader) {}

  execute(input: ComponentSummaryInput): ComponentSummaryResult {
    try {
      return this.summary.load(input.graphFileLocation)
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      throw error
    }
  }
}

function failure(code: ComponentSummaryErrorCode, message: string): ComponentSummaryResult {
  return ComponentSummaryResult.failure(code, message)
}
