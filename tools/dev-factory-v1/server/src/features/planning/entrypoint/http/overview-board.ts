import type { IncomingMessage, ServerResponse } from 'node:http'
import { EpicRepository } from '@dev-factory-v1/use-cases/data-access/epic/epic-repository'
import { IdeaRepository } from '@dev-factory-v1/use-cases/data-access/idea/idea-repository'
import { PlanningFoldersLoader } from '@dev-factory-v1/use-cases/data-access/planning-folders/planning-folders-loader'
import { ShowOverviewBoard } from '@dev-factory-v1/use-cases/planning-queries/overview-board'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/overview-board` returns the 4 columns of the overview board.
 */
export function overviewBoardEndpoint(targetRepo: string) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    const board = new ShowOverviewBoard(
      new PlanningFoldersLoader(targetRepo),
      new IdeaRepository(targetRepo),
      new EpicRepository(targetRepo),
    ).execute({})
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(board))
  }
}
