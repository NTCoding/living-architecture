import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder-domain-model/domain/construction/construction-errors'
import type { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/builder-facade'
import { ComponentDefinition } from '@living-architecture/riviere-builder-domain-model/domain/component-definition'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import type { AddComponentInput } from './add-component-input'
import type { AddComponentErrorCode, AddComponentResult } from './add-component-result'

/** @riviere-role command-use-case */
export class AddComponent {
  constructor(private readonly repository: RiviereBuilderRepository) {}

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
      const builder = this.repository.load(input.graphPathOption)
      const componentId = addDefinition(builder, definition.data.value)
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

function addDefinition(builder: RiviereBuilder, definition: ComponentDefinition['value']): string {
  switch (definition.type) {
    case 'UI':
      return builder.addUI(definition.input).id
    case 'API':
      return builder.addApi(definition.input).id
    case 'UseCase':
      return builder.addUseCase(definition.input).id
    case 'DomainOp':
      return builder.addDomainOp(definition.input).id
    case 'Event':
      return builder.addEvent(definition.input).id
    case 'EventHandler':
      return builder.addEventHandler(definition.input).id
    case 'Custom':
      return builder.addCustom(definition.input).id
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
    success: false,
    code,
    message,
  }
}
