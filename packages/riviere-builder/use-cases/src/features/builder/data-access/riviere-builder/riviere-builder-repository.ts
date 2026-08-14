import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/builder-facade'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereBuilderRepository {
  load(graphPathOption?: string): RiviereBuilder {
    const graphPath = this.resolveGraphPath(graphPathOption)

    if (!existsSync(graphPath)) {
      throw new GraphNotFoundError(graphPath)
    }

    const content = readFileSync(graphPath, 'utf-8')
    const parsed = this.parseJson(content, graphPath)
    const result = parseRiviereGraph(parsed)
    if (!result.success) {
      throw new GraphCorruptedError(graphPath, { cause: result.issues })
    }
    return RiviereBuilder.resume(result.graph, graphPath)
  }

  save(builder: RiviereBuilder): void {
    mkdirSync(dirname(builder.graphPath), { recursive: true })
    writeFileSync(builder.graphPath, builder.serialize(), 'utf-8')
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }

  private parseJson(content: string, graphPath: string): unknown {
    try {
      return JSON.parse(content)
    } catch (error) {
      throw new GraphCorruptedError(graphPath, { cause: error })
    }
  }
}
