type RequestToGuard = {
  readonly method: string | undefined
  readonly host: string | undefined
  readonly origin: string | undefined
}

/**
 * @riviere-role http-server
 *
 * Only this machine can use the factory. A request has to arrive at the loopback address the server
 * listens on, and a change has to come from one of the server's own pages, so another site that the
 * browser has open cannot make the factory do anything.
 */
export function refusalOf(request: RequestToGuard, port: number): string | undefined {
  const ownHosts = [`localhost:${port}`, `127.0.0.1:${port}`]
  if (request.host === undefined || !ownHosts.includes(request.host)) {
    return `The factory only accepts requests to localhost:${port} or 127.0.0.1:${port}.`
  }
  const ownOrigins = ownHosts.map((host) => `http://${host}`)
  const isRead = request.method === 'GET' || request.method === 'HEAD'
  if (!isRead && request.origin !== undefined && !ownOrigins.includes(request.origin)) {
    return `The factory only accepts changes from its own pages at http://127.0.0.1:${port}.`
  }
  return undefined
}
