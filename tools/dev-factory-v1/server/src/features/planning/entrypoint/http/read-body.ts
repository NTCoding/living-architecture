import type { IncomingMessage } from 'node:http'

const LARGEST_BODY_BYTES = 1_000_000

class BodyTooLarge extends Error {
  constructor() {
    super(`The body of the request is larger than ${LARGEST_BODY_BYTES} bytes.`)
    this.name = 'BodyTooLarge'
  }
}

class BodyIsNotAnObject extends Error {
  constructor() {
    super('The body of the request is a JSON object.')
    this.name = 'BodyIsNotAnObject'
  }
}

/**
 * @riviere-role http-request-parser
 *
 * Reads the JSON body of a request and gives back the object it holds. A body that is not a JSON
 * object, or one that is larger than a megabyte, is refused rather than passed on.
 */
export async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await textOf(request)
  const parsed: unknown = JSON.parse(body)
  if (!isMapping(parsed)) throw new BodyIsNotAnObject()
  return parsed
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      chunks.push(chunk)
      if (chunks.join('').length > LARGEST_BODY_BYTES) reject(new BodyTooLarge())
    })
    request.on('end', () => resolve(chunks.join('')))
  })
}
