import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PlanningDocumentText } from '../../queries/planning-document'

/** @riviere-role data-access-error */
export class PlanningDocumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanningDocumentError'
  }
}

/**
 * @riviere-role query-model-loader
 *
 * The Markdown of 1 planning document. The planning session is the only writer, so the reader takes
 * the file as it is and leaves the parsing of its blocks to the query.
 */
export class PlanningDocumentLoader {
  constructor(private readonly targetRepo: string) {}

  load(slug: string, document: string): PlanningDocumentText {
    const name = nameOf(document)
    return {
      name,
      markdown: readTextOf(join(this.targetRepo, 'docs', 'project', 'PRD', slug, name)),
    }
  }
}

function nameOf(document: string): string {
  if (!/^[A-Za-z0-9.-]+\.md$/.test(document)) {
    throw new PlanningDocumentError(`A planning document is a file that ends in .md: ${document}`)
  }
  return document
}

function readTextOf(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}
