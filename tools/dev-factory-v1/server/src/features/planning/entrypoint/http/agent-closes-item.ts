import type { IncomingMessage, ServerResponse } from 'node:http'
import { DecisionRepository } from '@dev-factory-v1/use-cases/data-access/decision/decision-repository'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { AgentClosesItem } from '@dev-factory-v1/use-cases/planning-commands/agent-closes-item'

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/agent/epics/:epic/items/:item/done` closes the item the planning agent has dealt with.
 */
export function agentClosesItemEndpoint(targetRepo: string) {
  return (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): void => {
    const result = new AgentClosesItem(
      new DecisionRepository(targetRepo),
      new ThreadRepository(targetRepo),
      () => new Date().toISOString(),
    ).execute({ epic: String(params['epic']), item: String(params['item']) })
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(result))
  }
}
