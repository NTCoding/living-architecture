import type { IncomingMessage, ServerResponse } from 'node:http'
import { DecisionRepository } from '@dev-factory-v1/use-cases/data-access/decision/decision-repository'
import { InboxFile } from '@dev-factory-v1/use-cases/planning-adapters/inbox/inbox-file'
import { AnswerDecision } from '@dev-factory-v1/use-cases/planning-commands/answer-decision'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/epics/:epic/decisions/:decision` records what you chose, or your own words.
 */
export function answerDecisionEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const body = await readBody(request)
    const result = new AnswerDecision(
      new DecisionRepository(targetRepo),
      new InboxFile(targetRepo),
      () => new Date().toISOString(),
    ).execute({
      epic: String(params['epic']),
      decision: String(params['decision']),
      choice: fieldOf(body, 'choice'),
      chosen: fieldOf(body, 'chosen'),
      reply: textOf(body, 'reply'),
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

function textOf(body: Record<string, unknown>, name: string): string | null {
  const value = body[name]
  return typeof value === 'string' ? value : null
}
