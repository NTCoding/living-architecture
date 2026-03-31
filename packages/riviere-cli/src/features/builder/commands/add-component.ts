import { readFile, writeFile } from 'node:fs/promises'
import {
  RiviereBuilder,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'
import {
  MissingRequiredOptionError,
  InvalidCustomPropertyError,
} from '../../../platform/infra/errors/errors'
import { addComponentToBuilder } from '../../../platform/domain/add-component'
import {
  buildDomainInput,
  type AddComponentInput,
} from '../../../platform/infra/component-mapping/add-component-mapper'
import type { AddComponentErrorCode, AddComponentResult } from './add-component-result'

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
export async function addComponent(input: AddComponentInput): Promise<AddComponentResult> {
  if (!validComponentTypes.has(input.componentType.toLowerCase())) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: `Invalid component type: ${input.componentType}`,
    }
  }

  if (
    input.lineNumber !== undefined &&
    (!Number.isInteger(input.lineNumber) || input.lineNumber < 1)
  ) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid line number: must be a positive integer',
    }
  }

  const graphExists = await fileExists(input.graphPath)
  if (!graphExists) {
    return {
      success: false,
      code: 'GRAPH_NOT_FOUND',
      message: `Graph not found at ${input.graphPath}`,
    }
  }

  const content = await readFile(input.graphPath, 'utf-8')
  const parsedContent = tryParseJson(content)
  if (parsedContent === null) {
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Graph file contains invalid JSON',
    }
  }

  const graph = parseRiviereGraph(parsedContent)
  const builder = RiviereBuilder.resume(graph)

  try {
    const domainInput = buildDomainInput(input)
    const componentId = addComponentToBuilder(builder, domainInput)
    await writeFile(input.graphPath, builder.serialize(), 'utf-8')
    return {
      success: true,
      componentId,
    }
  } catch (error) {
    return mapError(error)
  }
}

function tryParseJson(content: string): unknown | null {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function mapError(error: unknown): AddComponentResult {
  if (error instanceof MissingRequiredOptionError) {
    return failure('VALIDATION_ERROR', error.message)
  }
  if (error instanceof InvalidCustomPropertyError) {
    return failure('VALIDATION_ERROR', error.message)
  }
  if (error instanceof DomainNotFoundError) {
    return failure('DOMAIN_NOT_FOUND', error.message)
  }
  if (error instanceof CustomTypeNotFoundError) {
    return failure('CUSTOM_TYPE_NOT_FOUND', error.message)
  }
  /* v8 ignore start -- @preserve: DuplicateComponentError tested at entrypoint; defensive re-throw for unknown errors */
  if (error instanceof DuplicateComponentError) {
    return failure('DUPLICATE_COMPONENT', error.message)
  }
  throw error
  /* v8 ignore stop */
}

function failure(code: AddComponentErrorCode, message: string): AddComponentResult {
  return {
    success: false,
    code,
    message,
  }
}
