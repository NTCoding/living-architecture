import {
  readFile, writeFile 
} from 'node:fs/promises'
import {
  RiviereBuilder,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { resolveGraphPath } from '../../../platform/infra/graph-persistence/graph-path'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  isValidComponentType,
  VALID_COMPONENT_TYPES,
  type ComponentTypeFlag,
} from '../../../platform/infra/cli-presentation/component-types'
import { getErrorMessage } from '../../../platform/infra/errors/errors'
import {
  addComponentToBuilder,
  type AddComponentOptions,
} from '../../../platform/infra/cli-presentation/component-builder-input'

export type { AddComponentOptions }

export async function addComponent(options: AddComponentOptions): Promise<void> {
  // Validate
  if (!isValidComponentType(options.type)) {
    console.log(
      JSON.stringify(
        formatError(CliErrorCode.ValidationError, `Invalid component type: ${options.type}`, [
          `Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`,
        ]),
      ),
    )
    return
  }
  const componentType: ComponentTypeFlag = options.type

  const graphPath = resolveGraphPath(options.graph)
  const graphExists = await fileExists(graphPath)

  if (!graphExists) {
    console.log(
      JSON.stringify(
        formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
          'Run riviere builder init first',
        ]),
      ),
    )
    return
  }

  // Load
  const content = await readFile(graphPath, 'utf-8')
  const parsed: unknown = JSON.parse(content)
  const graph = parseRiviereGraph(parsed)
  const builder = RiviereBuilder.resume(graph)

  const sourceLocation: SourceLocation = {
    repository: options.repository,
    filePath: options.filePath,
    ...(options.lineNumber ? { lineNumber: parseInt(options.lineNumber, 10) } : {}),
  }

  // Mutate + Persist
  try {
    const componentId = addComponentToBuilder(builder, componentType, options, sourceLocation)
    await writeFile(graphPath, builder.serialize(), 'utf-8')
    if (options.json) {
      console.log(JSON.stringify(formatSuccess({ componentId })))
    }
  } catch (error) {
    if (error instanceof DomainNotFoundError) {
      console.log(
        JSON.stringify(
          formatError(CliErrorCode.DomainNotFound, error.message, [
            'Run riviere builder add-domain first',
          ]),
        ),
      )
      return
    }
    if (error instanceof CustomTypeNotFoundError) {
      console.log(
        JSON.stringify(
          formatError(CliErrorCode.CustomTypeNotFound, error.message, [
            'Run riviere builder add-custom-type first',
          ]),
        ),
      )
      return
    }
    if (error instanceof DuplicateComponentError) {
      console.log(JSON.stringify(formatError(CliErrorCode.DuplicateComponent, error.message, [])))
      return
    }
    console.log(
      JSON.stringify(formatError(CliErrorCode.ValidationError, getErrorMessage(error), [])),
    )
  }
}
