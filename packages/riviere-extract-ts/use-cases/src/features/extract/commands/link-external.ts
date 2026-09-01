import {
  ComponentNotFoundError,
  LinkType,
} from '@living-architecture/riviere-builder-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { LinkExternalInput } from './link-external-input'
import type { LinkExternalErrorCode, LinkExternalResult } from './link-external-result'

/** @riviere-role command-use-case */
export class LinkExternal {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: LinkExternalInput): LinkExternalResult {
    const parsedInput = parseInput(input)
    if (!parsedInput.success) return parsedInput.result

    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const externalLinkInput = {
        from: parsedInput.sourceId.toString(),
        target: {
          ...(input.targetDomain === undefined ? {} : { domain: input.targetDomain }),
          name: input.targetName,
          ...(input.targetUrl === undefined ? {} : { url: input.targetUrl }),
        },
        ...(parsedInput.linkType === undefined ? {} : { type: parsedInput.linkType.value }),
      }
      const { link: externalLink } = project.linkExternal(externalLinkInput)
      this.repository.save(input.graphFileLocation, project)
      return {
        result: {
          externalLink,
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
      throw error
    }
  }
}

function parseInput(
  input: LinkExternalInput,
):
  | { success: false; result: LinkExternalResult }
  | { success: true; sourceId: ComponentId; linkType: LinkType | undefined } {
  const sourceId = ComponentId.parse(input.from)
  if (!sourceId.success) {
    return { result: failure('VALIDATION_ERROR', sourceId.message), success: false }
  }

  const linkType = input.type === undefined ? undefined : LinkType.parse(input.type)
  if (linkType !== undefined && !linkType.success) {
    return {
      result: failure('VALIDATION_ERROR', `Invalid link type: ${input.type}`),
      success: false,
    }
  }

  return {
    linkType: linkType?.data,
    sourceId: sourceId.componentId,
    success: true,
  }
}

function failure(
  code: LinkExternalErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkExternalResult {
  return {
    result: {
      code,
      message,
      suggestions,
      success: false,
    },
  }
}
