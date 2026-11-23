import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * @riviere-role http-entrypoint
 *
 * `GET /api/server` says which port the factory listens on, so `./start-factory-ui` can tell whether
 * the server is already up.
 */
export function serverEndpoint(port: () => number) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ port: port(), pid: process.pid }))
  }
}
