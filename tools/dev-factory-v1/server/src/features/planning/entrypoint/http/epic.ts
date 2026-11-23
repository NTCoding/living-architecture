import type { IncomingMessage, ServerResponse } from 'node:http'

class MissingRouteParameter extends Error {
  constructor(name: string) {
    super(`The route needs the ${name} parameter.`)
    this.name = 'MissingRouteParameter'
  }
}
import { EpicRepository } from '@dev-factory-v1/use-cases/data-access/epic/epic-repository'
import { ShowEpic } from '@dev-factory-v1/use-cases/planning-queries/epic-view'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/epics/:epic` returns the stage, the features and the history of an epic, with the state
 * of each story's issue.
 */
export function epicEndpoint(
  targetRepo: string,
  issueStates: (
    numbers: readonly number[],
  ) => Promise<readonly { readonly number: number; readonly closed: boolean }[]>,
) {
  return async (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const view = await new ShowEpic(new EpicRepository(targetRepo), issueStates).execute({
      epic: requiredParam(params, 'epic'),
    })
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(view))
  }
}

function requiredParam(params: Readonly<Record<string, string>>, name: string): string {
  const value = params[name]
  if (value === undefined || value === '') throw new MissingRouteParameter(name)
  return value
}
