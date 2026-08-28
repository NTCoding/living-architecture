import { ComponentType } from '@living-architecture/riviere-builder-published-language'
import { ComponentChecklistLoader } from '../data-access/graph/query-loaders'
import { GraphCorruptedError } from '../data-access/graph/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/graph/graph-not-found-error'
import type { ComponentChecklistInput } from './component-checklist-input'
import {
  type ComponentChecklistErrorCode,
  ComponentChecklistResult,
} from './component-checklist-result'

/** @riviere-role query-model-use-case */
export class ComponentChecklist {
  constructor(private readonly components: ComponentChecklistLoader) {}

  execute(input: ComponentChecklistInput): ComponentChecklistResult {
    const componentType = input.type === undefined ? undefined : ComponentType.parse(input.type)
    if (componentType !== undefined && !componentType.success) {
      return failure('VALIDATION_ERROR', `Invalid component type: ${input.type}`)
    }

    try {
      return this.components.load(input.graphFileLocation, componentType?.data.value)
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
  return ComponentChecklistResult.failure(code, message)
}
