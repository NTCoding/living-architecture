import type { IncomingMessage, ServerResponse } from 'node:http'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { AgentReplies } from '@dev-factory-v1/use-cases/planning-commands/agent-replies'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/agent/epics/:epic/threads/:thread/replies` adds the planning agent's reply to a thread.
 */
export function agentRepliesEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const body = await readBody(request)
    const result = new AgentReplies(new ThreadRepository(targetRepo), () =>
      new Date().toISOString(),
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
