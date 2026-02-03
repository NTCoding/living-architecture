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
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  isValidComponentType,
  VALID_COMPONENT_TYPES,
} from '../../../platform/infra/cli-presentation/component-types'
import {
  getErrorMessage, MissingRequiredOptionError 
} from '../../../platform/infra/errors/errors'
import { addComponentToBuilder } from '../../../platform/domain/add-component'
import {
  buildDomainInput,
  type AddComponentInput,
} from '../../../platform/infra/component-mapping/add-component-mapper'

export async function addComponent(input: AddComponentInput): Promise<void> {
  if (!isValidComponentType(input.componentType)) {
    console.log(
      JSON.stringify(
        formatError(
          CliErrorCode.ValidationError,
          `Invalid component type: ${input.componentType}`,
          [`Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`],
        ),
      ),
    )
    return
  }

  const graphExists = await fileExists(input.graphPath)
  if (!graphExists) {
    console.log(
      JSON.stringify(
        formatError(CliErrorCode.GraphNotFound, `Graph not found at ${input.graphPath}`, [
          'Run riviere builder init first',
        ]),
      ),
    )
    return
  }

  const content = await readFile(input.graphPath, 'utf-8')
  const graph = parseRiviereGraph(JSON.parse(content))
  const builder = RiviereBuilder.resume(graph)

  try {
    const domainInput = buildDomainInput(input)
    const componentId = addComponentToBuilder(builder, domainInput)
    await writeFile(input.graphPath, builder.serialize(), 'utf-8')
    if (input.outputJson) {
      console.log(JSON.stringify(formatSuccess({ componentId })))
    }
  } catch (error) {
    handleError(error)
  }
}

function handleError(error: unknown): void {
  if (error instanceof MissingRequiredOptionError) {
    console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, error.message, [])))
    return
  }
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
  console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, getErrorMessage(error), [])))
}
