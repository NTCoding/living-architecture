import type { IncomingMessage, ServerResponse } from 'node:http'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { InboxFile } from '@dev-factory-v1/use-cases/planning-adapters/inbox/inbox-file'
import { ReplyToThread } from '@dev-factory-v1/use-cases/planning-commands/reply-to-thread'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/epics/:epic/threads/:thread/replies` adds your reply to a thread.
 */
export function replyToThreadEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const body = await readBody(request)
    const result = new ReplyToThread(
      new ThreadRepository(targetRepo),
      new InboxFile(targetRepo),
      () => new Date().toISOString(),
    ).execute({
      epic: String(params['epic']),
      thread: String(params['thread']),
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
