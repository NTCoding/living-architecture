import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { serveFactory } from '../../../../infra/http/presentation/serve'
import { documentEndpoint } from './document'
import { epicEndpoint } from './epic'

type Served = Awaited<ReturnType<typeof serveFactory>>

const servers: Served[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function serverWith(
  path: string,
  handle: Parameters<typeof serveFactory>[0]['routes'][number]['handle'],
): Promise<{ port: number; logged: string[] }> {
  const logged: string[] = []
  const server = await serveFactory({
    port: 0,
    log: (text: string) => logged.push(text),
    routes: [{ method: 'GET', path, handle }],
  })
  servers.push(server)
  return { port: server.port, logged }
}

describe('a route that is registered without its parameter', () => {
  it('says which epic it needed', async () => {
    const targetRepo = mkdtempSync(join(tmpdir(), 'factory-param-'))
    const { port, logged } = await serverWith(
      '/api/epics',
      epicEndpoint(targetRepo, () => Promise.resolve([])),
    )

    const response = await fetch(`http://127.0.0.1:${port}/api/epics`)

    expect(response.status).toBe(500)
    expect(logged).toStrictEqual([
      'The route GET /api/epics failed: MissingRouteParameter: The route needs the epic parameter.',
    ])
  })

  it('says which epic and which document it needed', async () => {
    const targetRepo = mkdtempSync(join(tmpdir(), 'factory-param-'))
    const { port, logged } = await serverWith(
      '/api/documents',
      documentEndpoint(targetRepo, (markdown) => markdown),
    )

    const response = await fetch(`http://127.0.0.1:${port}/api/documents`)

    expect(response.status).toBe(500)
    expect(logged).toStrictEqual([
      'The route GET /api/documents failed: MissingRouteParameter: The route needs the epic parameter.',
    ])
  })
})
