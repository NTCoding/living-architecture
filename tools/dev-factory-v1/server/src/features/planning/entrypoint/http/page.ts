import type { IncomingMessage, ServerResponse } from 'node:http'

type StaticFileReader = (
  name: string,
) => { readonly content: string; readonly type: string } | undefined

/**
 * @riviere-role http-entrypoint
 *
 * `GET /` and every page under it returns the HTML the UI boots from. The UI routes in the browser,
 * so every page gets the same file.
 */
export function pageEndpoint(readFile: StaticFileReader) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    const file = readFile('index.html')
    if (file === undefined) {
      response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('The factory UI has not been built. Run pnpm build in tools/dev-factory-v1/ui.')
      return
    }
    response.writeHead(200, { 'content-type': file.type })
    response.end(file.content)
  }
}
