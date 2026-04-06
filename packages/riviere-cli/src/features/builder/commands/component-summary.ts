import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ComponentSummaryInput } from './component-summary-input'
import type {
  ComponentSummaryErrorCode, ComponentSummaryResult 
} from './component-summary-result'

/** @riviere-role command-use-case */
export class ComponentSummary {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: ComponentSummaryInput): ComponentSummaryResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      return {
        ...builder.stats(),
        success: true,
      }
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
  return {
    code,
    message,
    success: false,
  }
}
