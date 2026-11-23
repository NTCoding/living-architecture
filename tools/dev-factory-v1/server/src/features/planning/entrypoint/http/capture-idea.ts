import type { IncomingMessage, ServerResponse } from 'node:http'
import { IdeaRepository } from '@dev-factory-v1/use-cases/data-access/idea/idea-repository'
import { CaptureIdea } from '@dev-factory-v1/use-cases/planning-commands/capture-idea'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/ideas` writes a new idea from a slug, a title and a summary.
 */
export function captureIdeaEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const body = await readBody(request)
    const result = new CaptureIdea(new IdeaRepository(targetRepo)).execute({
      slug: fieldOf(body, 'slug'),
      title: fieldOf(body, 'title'),
      summary: fieldOf(body, 'summary'),
    })
    response.writeHead(201, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(result))
  }
}

function fieldOf(body: Record<string, unknown>, name: string): string {
  const value = body[name]
  if (typeof value !== 'string' || value.trim() === '') throw new MissingBodyField(name)
  return value
}
