import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ThreadIds } from '../../queries/thread-ids'

/**
 * @riviere-role query-model-loader
 *
 * The ids of the threads an epic already has. A new comment needs the next free one, and the files
 * are named after it, so the reader has to look at the folder rather than an aggregate.
 */
export class ThreadIdsLoader {
  constructor(private readonly targetRepo: string) {}

  load(slug: string): ThreadIds {
    if (!/^[a-z0-9-]+$/.test(slug)) return { ids: [] }
    try {
      return { ids: readdirSync(folderOf(this.targetRepo, slug)).map(nameOf) }
    } catch {
      return { ids: [] }
    }
  }
}

function folderOf(targetRepo: string, slug: string): string {
  return join(targetRepo, 'docs', 'project', 'PRD', slug, 'threads')
}

function nameOf(fileName: string): string {
  return fileName.endsWith('.yml') ? fileName.slice(0, -4) : fileName
}
