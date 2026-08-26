import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/riviere-builder'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

/** @riviere-role aggregate-repository */
export class RiviereBuilderRepository {
  load(graphFileLocation: string): RiviereBuilder {
    if (!existsSync(graphFileLocation)) {
      throw new GraphNotFoundError(graphFileLocation)
    }

    const content = readFileSync(graphFileLocation, 'utf-8')
    const parsed = this.parseJson(content, graphFileLocation)
    const result = parseRiviereGraph(parsed)
    if (!result.success) {
      throw new GraphCorruptedError(graphFileLocation, { cause: result.issues })
    }
    return RiviereBuilder.resume(result.graph)
  }

  save(graphFileLocation: string, builder: RiviereBuilder): void {
    mkdirSync(dirname(graphFileLocation), { recursive: true })
    writeFileSync(graphFileLocation, builder.serialize(), 'utf-8')
  }

  private parseJson(content: string, graphPath: string): unknown {
    try {
      return JSON.parse(content)
    } catch (error) {
      throw new GraphCorruptedError(graphPath, { cause: error })
    }
  }
}
