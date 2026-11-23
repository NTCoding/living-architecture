import type { IncomingMessage, ServerResponse } from 'node:http'
import { EpicRepository } from '@dev-factory-v1/use-cases/data-access/epic/epic-repository'
import { RecordStories } from '@dev-factory-v1/use-cases/planning-commands/record-stories'

class MissingBodyField extends Error {
  constructor(name: string) {
    super(`The body of the request needs the ${name} field.`)
    this.name = 'MissingBodyField'
  }
}

/**
 * @riviere-role http-entrypoint
 *
 * `POST /api/agent/epics/:epic/stories` records the features and their issue numbers.
 */
export function recordStoriesEndpoint(
  targetRepo: string,
  readBody: (request: IncomingMessage) => Promise<Record<string, unknown>>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    params: Readonly<Record<string, string>>,
  ): Promise<void> => {
    const body = await readBody(request)
    const result = new RecordStories(new EpicRepository(targetRepo), () =>
      new Date().toISOString(),
    ).execute({ epic: String(params['epic']), features: featuresOf(body) })
    response.writeHead(201, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(result))
  }
}

function featuresOf(body: Record<string, unknown>): readonly {
  readonly id: string
  readonly title: string
  readonly stories: readonly number[]
}[] {
  const features = body['features']
  if (!Array.isArray(features)) throw new MissingBodyField('features')
  return features.map((feature: unknown) => featureOf(feature))
}

function featureOf(feature: unknown): {
  readonly id: string
  readonly title: string
  readonly stories: readonly number[]
} {
  if (!isMapping(feature)) throw new MissingBodyField('features')
  const fields = feature
  const stories = fields['stories']
  if (typeof fields['id'] !== 'string' || typeof fields['title'] !== 'string') {
    throw new MissingBodyField('features')
  }
  if (!Array.isArray(stories)) throw new MissingBodyField('features')
  return {
    id: fields['id'],
    title: fields['title'],
    stories: stories.filter((story): story is number => typeof story === 'number'),
  }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
