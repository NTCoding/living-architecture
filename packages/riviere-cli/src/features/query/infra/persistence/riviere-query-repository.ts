import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RiviereQuery } from '@living-architecture/riviere-query'
import { GraphCorruptedError } from '../../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../../platform/domain/graph-not-found-error'
import { fileExists } from '../../../../platform/infra/external-clients/filesystem/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role query-model-loader */
export class RiviereQueryRepository {
  load(graphPathOption?: string): RiviereQuery {
    const graphPath = this.resolveGraphPath(graphPathOption)

    if (!fileExists(graphPath)) {
      throw new GraphNotFoundError(graphPath)
    }

    const content = readFileSync(graphPath, 'utf-8')
    try {
      const parsed: unknown = JSON.parse(content)
      return RiviereQuery.fromJSON(parsed)
    } catch (error) {
      throw new GraphCorruptedError(graphPath, { cause: error })
    }
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
