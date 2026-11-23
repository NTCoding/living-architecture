import type { IncomingMessage, ServerResponse } from 'node:http'

class MissingRouteParameter extends Error {
  constructor(name: string) {
    super(`The route needs the ${name} parameter.`)
    this.name = 'MissingRouteParameter'
  }
}
import { PlanningDocumentLoader } from '@dev-factory-v1/use-cases/data-access/document/planning-document-loader'
import { ThreadIdsLoader } from '@dev-factory-v1/use-cases/data-access/thread/thread-ids-loader'
import { ThreadRepository } from '@dev-factory-v1/use-cases/data-access/thread/thread-repository'
import { ShowPlanningDocument } from '@dev-factory-v1/use-cases/planning-queries/planning-document'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/epics/:epic/documents/:document` returns a planning document with the questions it asks
 * and the comments on it.
 */
export function documentEndpoint(targetRepo: string) {
  return (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): void => {
    const view = new ShowPlanningDocument(
      new PlanningDocumentLoader(targetRepo),
      new ThreadIdsLoader(targetRepo),
      new ThreadRepository(targetRepo),
    ).execute({ epic: requiredParam(params, 'epic'), document: requiredParam(params, 'document') })
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(view))
  }
}

function requiredParam(params: Readonly<Record<string, string>>, name: string): string {
  const value = params[name]
  if (value === undefined || value === '') throw new MissingRouteParameter(name)
  return value
}
