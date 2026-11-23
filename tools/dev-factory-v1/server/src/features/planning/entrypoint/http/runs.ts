import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ListRuns } from '@dev-factory-v1/use-cases/queries/list-runs'
import type { ShowRun } from '@dev-factory-v1/use-cases/queries/show-run'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/runs` returns the runs, newest first.
 */
export function runsEndpoint(listRuns: ListRuns) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const status = new URL(String(request.url), 'http://127.0.0.1').searchParams.get('status')
    const runs = await listRuns.execute(status === null ? {} : { status })
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(runs))
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/runs/:run` returns one run with its waiting step.
 */
export function runEndpoint(showRun: ShowRun) {
  return async (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const run = await showRun.execute({ runId: String(params['run']) })
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(run))
  }
}
