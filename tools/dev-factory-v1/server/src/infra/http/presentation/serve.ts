import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { refusalOf } from './same-machine'

type Route = {
  readonly method: string
  readonly path: string
  readonly handle: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
}

type ServeOptions = {
  readonly port: number
  readonly routes: readonly Route[]
  readonly log: (text: string) => void
}

type ServedFactory = {
  readonly port: number
  readonly close: () => Promise<void>
}

/**
 * @riviere-role http-server
 *
 * The factory's own HTTP server. It refuses a request that did not come from this machine, it hands
 * the ones it accepts to the route that claims them, and it says 404 for the rest. It listens on
 * the loopback address only, so nothing outside this machine can reach it.
 */
export async function serveFactory(options: ServeOptions): Promise<ServedFactory> {
  const server = createServer((request, response) => {
    const refusal = refusalOf(
      { method: request.method, host: request.headers.host, origin: request.headers.origin },
      portOf(server.address()),
    )
    if (refusal !== undefined) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(refusal)
      return
    }
    const route = options.routes.find(
      (candidate) => candidate.method === request.method && candidate.path === pathOf(request.url),
    )
    if (route === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(`There is no route for ${String(request.method)} ${pathOf(request.url)}.`)
      return
    }
    void handleSafely(route, request, response, options.log)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port, '127.0.0.1', resolve)
  })
  return {
    port: portOf(server.address()),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

async function handleSafely(
  route: Route,
  request: IncomingMessage,
  response: ServerResponse,
  log: (text: string) => void,
): Promise<void> {
  try {
    await route.handle(request, response)
  } catch (error) {
    log(`The route ${route.method} ${route.path} failed: ${String(error)}`)
    if (response.headersSent) {
      response.end()
      return
    }
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('The factory could not answer that request.')
  }
}

/** @riviere-role http-server */
export function portOf(address: AddressInfo | string | null): number {
  return typeof address === 'object' && address !== null ? address.port : 0
}

/** @riviere-role http-server */
export function pathOf(url: string | undefined): string {
  return url === undefined ? '/' : new URL(url, 'http://127.0.0.1').pathname
}
