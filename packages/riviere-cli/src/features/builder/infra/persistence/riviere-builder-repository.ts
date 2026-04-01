import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { fileExists } from '../../../../platform/infra/graph-persistence/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereBuilderRepository {
  async exists(graphPathOption?: string): Promise<{ exists: boolean; graphPath: string }> {
    const graphPath = this.resolveGraphPath(graphPathOption)
    return {
      exists: await fileExists(graphPath),
      graphPath,
    }
  }

  async load(
    graphPathOption?: string,
  ): Promise<
    | { success: true; builder: RiviereBuilder; graphPath: string }
    | { success: false; code: 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'; graphPath: string }
  > {
    const graphPath = this.resolveGraphPath(graphPathOption)
    const graphExists = await fileExists(graphPath)

    if (!graphExists) {
      return {
        success: false,
        code: 'GRAPH_NOT_FOUND',
        graphPath,
      }
    }

    const content = await readFile(graphPath, 'utf-8')
    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch {
      return {
        success: false,
        code: 'GRAPH_CORRUPTED',
        graphPath,
      }
    }

    const graph = parseRiviereGraph(parsed)
    return {
      success: true,
      builder: RiviereBuilder.resume(graph),
      graphPath,
    }
  }

  async save(builder: RiviereBuilder, graphPathOption?: string): Promise<string> {
    const graphPath = this.resolveGraphPath(graphPathOption)
    await mkdir(dirname(graphPath), { recursive: true })
    await writeFile(graphPath, builder.serialize(), 'utf-8')
    return graphPath
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
