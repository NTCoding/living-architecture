import type { IncomingMessage, ServerResponse } from 'node:http'
import { EpicRepository } from '@dev-factory-v1/use-cases/data-access/epic/epic-repository'
import { IdeaRepository } from '@dev-factory-v1/use-cases/data-access/idea/idea-repository'
import { InboxFile } from '@dev-factory-v1/use-cases/planning-adapters/inbox/inbox-file'
import { StartPlanning } from '@dev-factory-v1/use-cases/planning-commands/start-planning'

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/ideas/:idea/start-planning` turns a captured idea into an epic at its first step.
 */
export function startPlanningEndpoint(targetRepo: string) {
  return (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): void => {
    const result = new StartPlanning(
      new IdeaRepository(targetRepo),
      new EpicRepository(targetRepo),
      new InboxFile(targetRepo),
      () => new Date().toISOString(),
    ).execute({ idea: String(params['idea']) })
    response.writeHead(201, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(result))
  }
}
