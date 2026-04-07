import {
  mkdirSync, readFileSync, writeFileSync 
} from 'node:fs'
import {
  dirname, join 
} from 'node:path'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { GraphCorruptedError } from '../../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../../platform/domain/graph-not-found-error'
import { fileExists } from '../../../../platform/infra/external-clients/filesystem/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereBuilderRepository {
  load(graphPathOption?: string): RiviereBuilder {
    const graphPath = this.resolveGraphPath(graphPathOption)

    if (!fileExists(graphPath)) {
      throw new GraphNotFoundError(graphPath)
    }

    const content = readFileSync(graphPath, 'utf-8')
    try {
      const parsed: unknown = JSON.parse(content)
      const graph = parseRiviereGraph(parsed)
      return RiviereBuilder.resume(graph, graphPath)
    } catch (error) {
      throw new GraphCorruptedError(graphPath, { cause: error })
    }
  }

  save(builder: RiviereBuilder): void {
    mkdirSync(dirname(builder.graphPath), { recursive: true })
    writeFileSync(builder.graphPath, builder.serialize(), 'utf-8')
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
