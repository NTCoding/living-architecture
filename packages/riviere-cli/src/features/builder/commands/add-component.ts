import {
  readFile, writeFile 
} from 'node:fs/promises'
import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  RiviereBuilder,
} from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import {
  addComponentToBuilder,
  type AddComponentInput as DomainInput,
} from '../../../platform/domain/add-component'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'

export {
  CustomTypeNotFoundError, DomainNotFoundError, DuplicateComponentError 
}

/** @riviere-role application-error */
export class InvalidGraphFileError extends Error {
  constructor(graphPath: string) {
    super(`Graph file contains invalid JSON: ${graphPath}`)
    this.name = 'InvalidGraphFileError'
  }
}

export interface AddComponentCommandInput {
  graphPath: string
  component: DomainInput
}

export interface AddComponentCommandResult {componentId: string}

/** @riviere-role command-use-case */
export async function addComponent(
  input: AddComponentCommandInput,
): Promise<AddComponentCommandResult | null> {
  const graphExists = await fileExists(input.graphPath)

  if (!graphExists) {
    return null
  }

  const content = await readFile(input.graphPath, 'utf-8')
  const parsedContent = tryParseJson(content, input.graphPath)
  const graph = parseRiviereGraph(parsedContent)
  const builder = RiviereBuilder.resume(graph)
  const componentId = addComponentToBuilder(builder, input.component)

  await writeFile(input.graphPath, builder.serialize(), 'utf-8')

  return { componentId }
}

/** @riviere-role command-use-case */
function tryParseJson(content: string, graphPath: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    throw new InvalidGraphFileError(graphPath)
  }
}
