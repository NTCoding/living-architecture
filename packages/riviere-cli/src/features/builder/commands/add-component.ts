import {
  readFile, writeFile 
} from 'node:fs/promises'
import {
  RiviereBuilder,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { isValidComponentType } from '../../../platform/infra/cli/presentation/component-types'
import {
  MissingRequiredOptionError,
  InvalidCustomPropertyError,
} from '../../../platform/infra/errors/errors'
import { addComponentToBuilder } from '../../../platform/domain/add-component'
import {
  buildDomainInput,
  type AddComponentInput,
} from '../../../platform/infra/component-mapping/add-component-mapper'
import type { AddComponentResult } from './add-component-result'

/** @riviere-role command-use-case */
export async function addComponent(input: AddComponentInput): Promise<AddComponentResult> {
  if (!isValidComponentType(input.componentType)) {
    return {
      success: false,
      code: CliErrorCode.ValidationError,
      message: `Invalid component type: ${input.componentType}`,
    }
  }

  if (
    input.lineNumber !== undefined &&
    (!Number.isInteger(input.lineNumber) || input.lineNumber < 1)
  ) {
    return {
      success: false,
      code: CliErrorCode.ValidationError,
      message: 'Invalid line number: must be a positive integer',
    }
  }

  const graphExists = await fileExists(input.graphPath)
  if (!graphExists) {
    return {
      success: false,
      code: CliErrorCode.GraphNotFound,
      message: `Graph not found at ${input.graphPath}`,
    }
  }

  const content = await readFile(input.graphPath, 'utf-8')
  const parsedContent = tryParseJson(content)
  if (parsedContent === null) {
    return {
      success: false,
      code: CliErrorCode.ValidationError,
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
    return {
      success: false,
      code: CliErrorCode.ValidationError,
      message: error.message,
    }
  }
  if (error instanceof InvalidCustomPropertyError) {
    return {
      success: false,
      code: CliErrorCode.ValidationError,
      message: error.message,
    }
  }
  if (error instanceof DomainNotFoundError) {
    return {
      success: false,
      code: CliErrorCode.DomainNotFound,
      message: error.message,
    }
  }
  if (error instanceof CustomTypeNotFoundError) {
    return {
      success: false,
      code: CliErrorCode.CustomTypeNotFound,
      message: error.message,
    }
  }
  /* v8 ignore start -- @preserve: DuplicateComponentError tested at entrypoint; defensive re-throw for unknown errors */
  if (error instanceof DuplicateComponentError) {
    return {
      success: false,
      code: CliErrorCode.DuplicateComponent,
      message: error.message,
    }
  }
  throw error
  /* v8 ignore stop */
}
