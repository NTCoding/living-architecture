import type { IncomingMessage, ServerResponse } from 'node:http'
import { ThreadIdsLoader } from '@dev-factory-v1/use-cases/data-access/thread/thread-ids-loader'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { InboxFile } from '@dev-factory-v1/use-cases/planning-adapters/inbox/inbox-file'
import { CommentOnDocument } from '@dev-factory-v1/use-cases/planning-commands/comment-on-document'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/epics/:epic/threads` opens a thread on a passage of a planning document.
 */
export function commentOnDocumentEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const body = await readBody(request)
    const result = new CommentOnDocument(
      new ThreadRepository(targetRepo),
      new ThreadIdsLoader(targetRepo),
      new InboxFile(targetRepo),
      () => new Date().toISOString(),
    ).execute({
      epic: String(params['epic']),
      document: fieldOf(body, 'document'),
      anchor: {
        selectedText: fieldOf(body, 'selectedText'),
        prefix: textOf(body, 'prefix'),
        suffix: textOf(body, 'suffix'),
        firstLine: numberOf(body, 'firstLine'),
        occurrence: numberOf(body, 'occurrence'),
      },
      text: fieldOf(body, 'text'),
    })
    response.writeHead(201, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(result))
  }
}

function fieldOf(body: Record<string, unknown>, name: string): string {
  const value = body[name]
  if (typeof value !== 'string' || value.trim() === '') throw new MissingBodyField(name)
  return value
}

function textOf(body: Record<string, unknown>, name: string): string {
  const value = body[name]
  return typeof value === 'string' ? value : ''
}

function numberOf(body: Record<string, unknown>, name: string): number {
  const value = body[name]
  if (typeof value !== 'number') throw new MissingBodyField(name)
  return value
}
