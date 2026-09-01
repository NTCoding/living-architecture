import {
  ComponentDefinition,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder-published-language'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { AddComponentInput } from './add-component-input'
import type { AddComponentErrorCode, AddComponentResult } from './add-component-result'

/** @riviere-role command-use-case */
export class AddComponent {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: AddComponentInput): AddComponentResult {
    if (
      input.lineNumber !== undefined &&
      (!Number.isSafeInteger(input.lineNumber) || input.lineNumber < 1)
    ) {
      return failure('VALIDATION_ERROR', 'Invalid line number: must be a positive integer')
    }

    if (
      input.columnNumber !== undefined &&
      (!Number.isSafeInteger(input.columnNumber) || input.columnNumber < 1)
    ) {
      return failure('VALIDATION_ERROR', 'Invalid column number: must be a positive integer')
    }

    try {
      const definition = ComponentDefinition.parse(input)
      if (!definition.success) return failure('VALIDATION_ERROR', definition.message)
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const componentId = project.addComponent(definition.data.value)
      this.repository.save(input.graphFileLocation, project)
      return {
        result: {
          success: true,
          componentId,
        },
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) return failure('GRAPH_NOT_FOUND', error.message)
      if (error instanceof GraphCorruptedError)
        return failure('VALIDATION_ERROR', 'Graph file contains invalid JSON')
      return mapError(error)
    }
  }
}

function mapError(error: unknown): AddComponentResult {
  if (error instanceof DomainNotFoundError) {
    return failure('DOMAIN_NOT_FOUND', error.message)
  }
  if (error instanceof CustomTypeNotFoundError) {
    return failure('CUSTOM_TYPE_NOT_FOUND', error.message)
  }
  if (error instanceof DuplicateComponentError) {
    return failure('DUPLICATE_COMPONENT', error.message)
  }
  if (error instanceof Error) {
    return failure('VALIDATION_ERROR', error.message)
  }
  throw error
}

function failure(code: AddComponentErrorCode, message: string): AddComponentResult {
  return {
    result: {
      success: false,
      code,
      message,
    },
  }
}
