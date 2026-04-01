import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RiviereQuery } from '@living-architecture/riviere-query'
import { fileExists } from '../../../../platform/infra/graph-persistence/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereQueryRepository {
  async load(
    graphPathOption?: string,
  ): Promise<
    | { success: true; query: RiviereQuery; graphPath: string }
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

    return {
      success: true,
      query: RiviereQuery.fromJSON(parsed),
      graphPath,
    }
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
