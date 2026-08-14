import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { ComponentType } from '@living-architecture/riviere-builder-domain-model/domain/component-type'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import type { ComponentChecklistInput } from './component-checklist-input'
import type {
  ComponentChecklistErrorCode,
  ComponentChecklistResult,
} from './component-checklist-result'

/** @riviere-role command-use-case */
export class ComponentChecklist {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: ComponentChecklistInput): ComponentChecklistResult {
    const componentType = input.type === undefined ? undefined : ComponentType.parse(input.type)
    if (componentType !== undefined && !componentType.success) {
      return failure('VALIDATION_ERROR', `Invalid component type: ${input.type}`)
    }

    try {
      const builder = this.repository.load(input.graphPathOption)
      const allComponents = builder.query().components()
      const filteredComponents =
        componentType === undefined
          ? allComponents
          : allComponents.filter((component) => component.type === componentType.data.value)
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
