import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ComponentChecklistInput } from './component-checklist-input'
import type {
  ComponentChecklistErrorCode,
  ComponentChecklistResult,
} from './component-checklist-result'

/** @riviere-role command-use-case */
export class ComponentChecklist {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: ComponentChecklistInput): ComponentChecklistResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const allComponents = builder.query().components()
      const filteredComponents =
        input.type === undefined
          ? allComponents
          : allComponents.filter((component) => component.type === input.type)
      const components = filteredComponents.map((component) => ({
        domain: component.domain,
        id: component.id,
        name: component.name,
        type: component.type,
      }))
      return {
        components,
        success: true,
        total: components.length,
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

function failure(code: ComponentChecklistErrorCode, message: string): ComponentChecklistResult {
  return {
    code,
    message,
    success: false,
  }
}
