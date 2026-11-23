import type { IncomingMessage, ServerResponse } from 'node:http'
import { EpicRepository } from '@dev-factory-v1/use-cases/data-access/epic/epic-repository'
import { PlanningFoldersLoader } from '@dev-factory-v1/use-cases/data-access/planning-folders/planning-folders-loader'
import { ShowPlanningBoard } from '@dev-factory-v1/use-cases/planning-queries/planning-board'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/planning-board` returns the 6 steps of planning with the epics on each one.
 */
export function planningBoardEndpoint(targetRepo: string) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    const board = new ShowPlanningBoard(
      new PlanningFoldersLoader(targetRepo),
      new EpicRepository(targetRepo),
    ).execute({})
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(board))
  }
}
