import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RiviereQuery } from '@living-architecture/riviere-query'
import { fileExists } from '../../../../platform/infra/external-clients/filesystem/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereQueryRepository {
  load(graphPathOption?: string):
    | {
      success: true
      query: RiviereQuery
      graphPath: string
    }
    | {
      success: false
      code: 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'
      graphPath: string
    } {
    const graphPath = this.resolveGraphPath(graphPathOption)
    const graphExists = fileExists(graphPath)

    if (!graphExists) {
      return {
        success: false,
        code: 'GRAPH_NOT_FOUND',
        graphPath,
      }
    }

    const content = readFileSync(graphPath, 'utf-8')
    try {
      const parsed: unknown = JSON.parse(content)
      return {
        success: true,
        query: RiviereQuery.fromJSON(parsed),
        graphPath,
      }
    } catch {
      return {
        success: false,
        code: 'GRAPH_CORRUPTED',
        graphPath,
      }
    }
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
