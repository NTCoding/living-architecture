import { CustomTypeAlreadyDefinedError } from '@living-architecture/riviere-builder-domain-model/domain/construction/construction-errors'
import { CustomPropertyType } from '@living-architecture/riviere-schema-published-language/custom-property-type'
import type { CustomPropertyDefinition } from '@living-architecture/riviere-schema-published-language/schema'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import type { DefineCustomTypeInput } from './define-custom-type-input'
import type { DefineCustomTypeErrorCode, DefineCustomTypeResult } from './define-custom-type-result'

/** @riviere-role command-use-case */
export class DefineCustomType {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: DefineCustomTypeInput): DefineCustomTypeResult {
    const requiredProperties = parseProperties(input.requiredProperties)
    if (!requiredProperties.success) return requiredProperties.result
    const optionalProperties = parseProperties(input.optionalProperties)
    if (!optionalProperties.success) return optionalProperties.result

    try {
      const builder = this.repository.load(input.graphPathOption)
      builder.defineCustomType({
        ...(input.description !== undefined && { description: input.description }),
        name: input.name,
        ...(Object.keys(optionalProperties.properties).length > 0
          ? { optionalProperties: optionalProperties.properties }
          : {}),
        ...(Object.keys(requiredProperties.properties).length > 0
          ? { requiredProperties: requiredProperties.properties }
          : {}),
      })
      this.repository.save(builder)
      return {
        description: input.description,
        name: input.name,
        optionalProperties: optionalProperties.properties,
        requiredProperties: requiredProperties.properties,
        success: true,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof CustomTypeAlreadyDefinedError) {
        return failure('VALIDATION_ERROR', error.message)
      }
      throw error
    }
  }
}

function parseProperties(
  properties: Record<string, { description?: string; type: string }>,
):
  | { success: true; properties: Record<string, CustomPropertyDefinition> }
  | { success: false; result: DefineCustomTypeResult } {
  const parsedProperties: Record<string, CustomPropertyDefinition> = {}
  for (const [name, definition] of Object.entries(properties)) {
    const propertyType = CustomPropertyType.parse(definition.type)
    if (!propertyType.success) {
      return {
        success: false,
        result: failure(
          'VALIDATION_ERROR',
          `Invalid property type: "${definition.type}". Valid types: ${CustomPropertyType.names().join(', ')}`,
        ),
      }
    }
    parsedProperties[name] = {
      ...(definition.description === undefined ? {} : { description: definition.description }),
      type: propertyType.propertyType.name(),
    }
  }
  return { success: true, properties: parsedProperties }
}

function failure(code: DefineCustomTypeErrorCode, message: string): DefineCustomTypeResult {
  return {
    code,
    message,
    success: false,
  }
}
