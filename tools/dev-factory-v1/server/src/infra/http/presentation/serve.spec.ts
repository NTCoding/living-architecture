import { get as httpGet } from 'node:http'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileChangeStreams } from './change-stream'
import { pathOf, portOf, serveFactory } from './serve'

class RouteFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouteFailure'
  }
}

type ServedFactory = Awaited<ReturnType<typeof serveFactory>>

const servers: ServedFactory[] = []
const streams: FileChangeStreams[] = []

afterEach(async () => {
  streams.splice(0).forEach((stream) => stream.close())
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function startedServer(
  routes: Parameters<typeof serveFactory>[0]['routes'] = [],
  log: (text: string) => void = () => undefined,
): Promise<ServedFactory> {
  const server = await serveFactory({ port: 0, routes, log })
  servers.push(server)
  return server
}

describe('serveFactory', () => {
  it('answers the route that claims the request', async () => {
    const server = await startedServer([
      {
        method: 'GET',
        path: '/api/server',
        handle: (_request, response) => {
          response.writeHead(200, { 'content-type': 'application/json' })
          response.end(JSON.stringify({ port: server.port }))
        },
      },
    ])

    const response = await fetch(`http://127.0.0.1:${server.port}/api/server`)

    expect(await response.json()).toStrictEqual({ port: server.port })
  })

  it('says 404 for a route it does not have', async () => {
    const server = await startedServer()

    const response = await fetch(`http://127.0.0.1:${server.port}/api/nothing`)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('There is no route for GET /api/nothing.')
  })

  it('refuses a request that was sent to another host name', async () => {
    const server = await startedServer()

    const status = await statusWithHost(server.port, '/api/nothing', 'example.com')

    expect(status).toBe(403)
  })

  it('refuses a change from another site', async () => {
    const server = await startedServer([
      {
        method: 'POST',
        path: '/api/ideas',
        handle: (_request, response) => {
          response.end('ok')
        },
      },
    ])

    const response = await fetch(`http://127.0.0.1:${server.port}/api/ideas`, {
      method: 'POST',
      headers: { origin: 'http://example.com' },
    })

    expect(response.status).toBe(403)
  })

  it('says 500 and logs the failure when a route throws', async () => {
    const logged: string[] = []
    const server = await startedServer(
      [
        {
          method: 'GET',
          path: '/api/broken',
          handle: () => {
            throw new RouteFailure('The file is not YAML.')
          },
        },
      ],
      (text) => logged.push(text),
    )

    const response = await fetch(`http://127.0.0.1:${server.port}/api/broken`)

    expect(response.status).toBe(500)
    expect(logged).toStrictEqual([
      'The route GET /api/broken failed: RouteFailure: The file is not YAML.',
    ])
  })

  it('says 500 without a second body when the route has already written', async () => {
    const server = await startedServer([
      {
        method: 'GET',
        path: '/api/half',
        handle: (_request, response) => {
          response.writeHead(200, { 'content-type': 'text/plain' })
          throw new RouteFailure('The file is not YAML.')
        },
      },
    ])

    const response = await fetch(`http://127.0.0.1:${server.port}/api/half`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })

  it('reads the path of a request without its query', () => {
    expect(pathOf('/api/runs?epic=one')).toBe('/api/runs')
    expect(pathOf(undefined)).toBe('/')
  })

  it('reads 0 from an address that is not a socket', () => {
    expect(portOf('a pipe')).toBe(0)
    expect(portOf(null)).toBe(0)
  })

  it('sends a change when a watched file is written', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'factory-change-'))
    const watched = join(folder, 'epic.yml')
    writeFileSync(watched, 'title: One\n')
    const stream = new FileChangeStreams({ checkMilliseconds: 10, log: () => undefined })
    streams.push(stream)
    const server = await startedServer([
      {
        method: 'GET',
        path: '/api/changes',
        handle: (_request, response) => {
          stream.open([{ path: watched, event: 'epic' }], response)
        },
      },
    ])
    const opened = openedStream()
    const reading = openStream(server.port, opened.resolve)
    await opened.when

    writeFileSync(watched, 'title: Two\n')

    expect(await reading).toContain('data: {"kind":"file","file":"epic"}')
  })
})

function statusWithHost(port: number, path: string, host: string): Promise<number> {
  return new Promise((resolve) => {
    const request = httpGet({ port, path, headers: { host } }, (response) =>
      resolve(response.statusCode ?? 0),
    )
    request.end()
  })
}

function openedStream(): { readonly when: Promise<void>; readonly resolve: () => void } {
  const opened: { resolve: () => void } = { resolve: () => undefined }
  const when = new Promise<void>((done) => {
    opened.resolve = done
  })
  return { when, resolve: () => opened.resolve() }
}

function openStream(port: number, opened: () => void): Promise<string> {
  return new Promise((resolve) => {
    const seen = { text: '', started: false }
    const request = httpGet({ port, path: '/api/changes' }, (response) => {
      response.setEncoding('utf8')
      response.on('data', (chunk: string) => {
        seen.text += chunk
        if (!seen.started) {
          seen.started = true
          opened()
        }
        if (!seen.text.includes('"file"')) return
        request.destroy()
        resolve(seen.text)
      })
    })
    setTimeout(() => resolve(seen.text), 2000)
    request.end()
  })
}
