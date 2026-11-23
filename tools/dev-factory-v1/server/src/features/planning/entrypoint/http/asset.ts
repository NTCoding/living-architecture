import type { IncomingMessage, ServerResponse } from 'node:http'

type StaticFileReader = (
  name: string,
) => { readonly content: string; readonly type: string } | undefined

/**
 * @riviere-role http-entrypoint
 *
 * `GET /assets/:file` returns one file of the UI bundle.
 */
export function assetEndpoint(readFile: StaticFileReader) {
  return (
    _request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): void => {
    const file = readFile(String(params['file']))
    if (file === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('There is no such asset.')
      return
    }
    response.writeHead(200, { 'content-type': file.type })
    response.end(file.content)
  }
}
