import { readFile } from 'node:fs/promises'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { resolveGraphPath } from './graph-path'
import { fileExists } from './file-existence'
import { reportGraphNotFound } from '../cli/presentation/graph-error-output'

/** @riviere-role external-client-service */
export async function loadGraphBuilder(graphPath: string): Promise<RiviereBuilder> {
  const content = await readFile(graphPath, 'utf-8')
  const parsed: unknown = JSON.parse(content)
  const graph = parseRiviereGraph(parsed)
  return RiviereBuilder.resume(graph)
}

/** @riviere-role external-client-service */
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
