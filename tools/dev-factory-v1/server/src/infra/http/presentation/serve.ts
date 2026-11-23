import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { refusalOf } from './same-machine'

type Route = {
  readonly method: string
  readonly path: string
  readonly handle: (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ) => void | Promise<void>
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
    const path = pathOf(request.url)
    const match = options.routes
      .filter((candidate) => candidate.method === request.method)
      .map((candidate) => ({ route: candidate, params: paramsOf(candidate.path, path) }))
      .find((candidate) => candidate.params !== undefined)
    if (match?.params === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(`There is no route for ${String(request.method)} ${path}.`)
      return
    }
    void handleSafely(match.route, request, response, match.params, options.log)
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
  params: Readonly<Record<string, string>>,
  log: (text: string) => void,
): Promise<void> {
  try {
    await route.handle(request, response, params)
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

/**
 * @riviere-role http-server
 *
 * The values of the `:name` segments of a path, or nothing when the path does not fit the pattern.
 */
export function paramsOf(pattern: string, path: string): Record<string, string> | undefined {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return undefined
  const params: Record<string, string> = {}
  for (const [index, part] of patternParts.entries()) {
    const actual = String(pathParts[index])
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(actual)
      continue
    }
    if (part !== actual) return undefined
  }
  return params
}

/** @riviere-role http-server */
export function portOf(address: AddressInfo | string | null): number {
  return typeof address === 'object' && address !== null ? address.port : 0
}

/** @riviere-role http-server */
export function pathOf(url: string | undefined): string {
  return url === undefined ? '/' : new URL(url, 'http://127.0.0.1').pathname
}
