import {
  ComponentNotFoundError,
  DuplicateLinkError,
  RelationshipTypeNotFoundError,
} from '@living-architecture/riviere-builder-domain-model/domain/construction/construction-errors'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import { LinkType } from '@living-architecture/riviere-builder-domain-model/domain/link-type'
import { ComponentType } from '@living-architecture/riviere-builder-domain-model/domain/component-type'
import type { LinkComponentsInput } from './link-components-input'
import type { LinkComponentsErrorCode, LinkComponentsResult } from './link-components-result'

/** @riviere-role command-use-case */
export class LinkComponents {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: LinkComponentsInput): LinkComponentsResult {
    const parsedInput = parseInput(input)
    if (!parsedInput.success) return parsedInput.result

    try {
      const builder = this.repository.load(input.graphPathOption)
      const linkInput: {
        from: string
        to: string
        type?: 'sync' | 'async'
        relationshipType?: string
        condition?: string
        sourceLocation?: NonNullable<LinkComponentsInput['sourceLocation']>
      } = {
        from: parsedInput.sourceId.toString(),
        to: ComponentId.parseFromParts({
          domain: input.targetDomain,
          module: input.targetModule,
          name: input.targetName,
          type: parsedInput.componentType.componentIdValue,
        }).toString(),
      }
      if (parsedInput.linkType !== undefined) {
        linkInput.type = parsedInput.linkType.value
      }
      if (input.relationshipType !== undefined) {
        linkInput.relationshipType = input.relationshipType
      }
      if (input.condition !== undefined) {
        linkInput.condition = input.condition
      }
      if (input.sourceLocation !== undefined) {
        linkInput.sourceLocation = input.sourceLocation
      }
      const link = builder.link(linkInput)
      this.repository.save(builder)
      return {
        result: {
          link,
          success: true,
        },
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof ComponentNotFoundError) {
        return failure('COMPONENT_NOT_FOUND', error.message, error.suggestions)
      }
      if (error instanceof DuplicateLinkError || error instanceof RelationshipTypeNotFoundError) {
        return failure('VALIDATION_ERROR', error.message)
      }
      throw error
    }
  }
}

function parseInput(input: LinkComponentsInput):
  | {
      success: false
      result: LinkComponentsResult
    }
  | {
      success: true
      componentType: ComponentType
      linkType: LinkType | undefined
      sourceId: ComponentId
    } {
  const sourceId = ComponentId.parse(input.from)
  if (!sourceId.success) {
    return {
      result: failure('VALIDATION_ERROR', sourceId.message),
      success: false,
    }
  }
  const componentType = ComponentType.parse(input.targetType)
  if (!componentType.success) {
    return {
      result: failure('VALIDATION_ERROR', `Invalid component type: ${input.targetType}`),
      success: false,
    }
  }
  const linkType = input.type === undefined ? undefined : LinkType.parse(input.type)
  if (linkType !== undefined && !linkType.success) {
    return {
      result: failure('VALIDATION_ERROR', `Invalid link type: ${input.type}`),
      success: false,
    }
  }
  return {
    componentType: componentType.data,
    linkType: linkType?.data,
    sourceId: sourceId.componentId,
    success: true,
  }
}

function failure(
  code: LinkComponentsErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkComponentsResult {
  return {
    result: {
      code,
      message,
      suggestions,
      success: false,
    },
  }
}
