import type { IncomingMessage, ServerResponse } from 'node:http'
import { DecisionRepository } from '@dev-factory-v1/use-cases/data-access/decision/decision-repository'
import { PlanningFoldersLoader } from '@dev-factory-v1/use-cases/data-access/planning-folders/planning-folders-loader'
import { ThreadIdsLoader } from '@dev-factory-v1/use-cases/data-access/thread/thread-ids-loader'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { ListWaitingForNick } from '@dev-factory-v1/use-cases/planning-queries/waiting-for-nick'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/waiting-for-you` returns the threads and the decisions that wait for Nick.
 */
export function waitingForYouEndpoint(targetRepo: string) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    const waiting = new ListWaitingForNick(
      new PlanningFoldersLoader(targetRepo),
      new ThreadIdsLoader(targetRepo),
      new ThreadRepository(targetRepo),
      new DecisionRepository(targetRepo),
    ).execute({})
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(waiting))
  }
}
