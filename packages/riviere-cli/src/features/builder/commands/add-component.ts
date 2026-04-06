import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import { addComponentToBuilder } from '../../../platform/domain/add-component'
import {
  createDomainInput,
  isAddComponentValidationError,
} from '../../../platform/domain/add-component-input-factory'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddComponentInput } from './add-component-input'
import type {
  AddComponentErrorCode, AddComponentResult 
} from './add-component-result'

const validComponentTypes = new Set([
  'ui',
  'api',
  'usecase',
  'domainop',
  'event',
  'eventhandler',
  'custom',
])

/** @riviere-role command-use-case */
export class AddComponent {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: AddComponentInput): AddComponentResult {
    if (!validComponentTypes.has(input.componentType.toLowerCase())) {
      return failure('VALIDATION_ERROR', `Invalid component type: ${input.componentType}`)
    }

    if (
      input.lineNumber !== undefined &&
      (!Number.isInteger(input.lineNumber) || input.lineNumber < 1)
    ) {
      return failure('VALIDATION_ERROR', 'Invalid line number: must be a positive integer')
    }

    try {
      const builder = this.repository.load(input.graphPathOption)
      const componentId = addComponentToBuilder(builder, createDomainInput(input))
      this.repository.save(builder)
      return {
        success: true,
        componentId,
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
  if (isAddComponentValidationError(error)) {
    return failure('VALIDATION_ERROR', error.message)
  }
  if (error instanceof Error) {
    return failure('VALIDATION_ERROR', error.message)
  }
  throw error
}

function failure(code: AddComponentErrorCode, message: string): AddComponentResult {
  return {
    success: false,
    code,
    message,
  }
}
