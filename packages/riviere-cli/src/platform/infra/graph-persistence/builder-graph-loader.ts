import { readFile } from 'node:fs/promises'
import {
  ComponentNotFoundError, RiviereBuilder 
} from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { formatError } from '../cli-presentation/output'
import { CliErrorCode } from '../cli-presentation/error-codes'
import { resolveGraphPath } from './graph-path'
import { fileExists } from './file-existence'

/** @riviere-role repository */
export function reportGraphNotFound(graphPath: string): void {
  console.log(
    JSON.stringify(
      formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
        'Run riviere builder init first',
      ]),
    ),
  )
}

/** @riviere-role repository */
export async function loadGraphBuilder(graphPath: string): Promise<RiviereBuilder> {
  const content = await readFile(graphPath, 'utf-8')
  const parsed: unknown = JSON.parse(content)
  const graph = parseRiviereGraph(parsed)
  return RiviereBuilder.resume(graph)
}

/** @riviere-role repository */
export async function withGraphBuilder(
  graphPathOption: string | undefined,
  handler: (builder: RiviereBuilder, graphPath: string) => Promise<void>,
): Promise<void> {
  const graphPath = resolveGraphPath(graphPathOption)
  const graphExists = await fileExists(graphPath)

  if (!graphExists) {
    reportGraphNotFound(graphPath)
    return
  }

  const builder = await loadGraphBuilder(graphPath)
  await handler(builder, graphPath)
}

/** @riviere-role repository */
export function handleComponentNotFoundError(error: unknown): void {
  if (!(error instanceof ComponentNotFoundError)) {
    throw error
  }
  console.log(
    JSON.stringify(formatError(CliErrorCode.ComponentNotFound, error.message, error.suggestions)),
  )
}

/** @riviere-role repository */
export function tryBuilderOperation<T>(operation: () => T): T | undefined {
  try {
    return operation()
  } catch (error) {
    handleComponentNotFoundError(error)
    return undefined
  }
}
