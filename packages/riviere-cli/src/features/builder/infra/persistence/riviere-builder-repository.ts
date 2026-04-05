import {
  mkdirSync, readFileSync, writeFileSync 
} from 'node:fs'
import {
  dirname, join 
} from 'node:path'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { fileExists } from '../../../../platform/infra/external-clients/filesystem/file-existence'

const DEFAULT_GRAPH_PATH = '.riviere/graph.json'

/** @riviere-role aggregate-repository */
export class RiviereBuilderRepository {
  exists(graphPathOption?: string): {
    exists: boolean
    graphPath: string
  } {
    const graphPath = this.resolveGraphPath(graphPathOption)
    return {
      exists: fileExists(graphPath),
      graphPath,
    }
  }

  load(graphPathOption?: string):
    | {
      success: true
      builder: RiviereBuilder
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
      const graph = parseRiviereGraph(parsed)
      return {
        success: true,
        builder: RiviereBuilder.resume(graph),
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

  save(builder: RiviereBuilder, graphPathOption?: string): string {
    const graphPath = this.resolveGraphPath(graphPathOption)
    mkdirSync(dirname(graphPath), { recursive: true })
    writeFileSync(graphPath, builder.serialize(), 'utf-8')
    return graphPath
  }

  private resolveGraphPath(graphPathOption?: string): string {
    return graphPathOption ?? join(process.cwd(), DEFAULT_GRAPH_PATH)
  }
}
