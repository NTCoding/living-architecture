import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Writable, Readable } from 'node:stream'
import {
  readResponse,
  writableStream,
  readableStream,
  readStdin,
  runAcpSession,
  type AcpSessionMessage,
} from './acp-session'

const { mockSpawn, mockClient, mockNdJsonStream } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockClient: vi.fn(),
  mockNdJsonStream: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
}))

vi.mock('@agentclientprotocol/sdk', () => ({
  client: mockClient,
  methods: {
    client: {
      session: { requestPermission: 'client/session/requestPermission' },
      fs: { readTextFile: 'client/fs/readTextFile', writeTextFile: 'client/fs/writeTextFile' },
    },
    agent: { initialize: 'agent/initialize' },
  },
  ndJsonStream: mockNdJsonStream,
  PROTOCOL_VERSION: '1.0',
}))

class StreamFailureTestError extends Error {}

function mockSession(updates: readonly AcpSessionMessage[]): {
  nextUpdate(): Promise<AcpSessionMessage>
} {
  const responses: AcpSessionMessage[] = [...updates, { kind: 'stop' }]
  return {
    nextUpdate: async () => responses.shift() ?? { kind: 'stop' },
  }
}

describe('readResponse', () => {
  it('returns an empty string when the session stops', async () => {
    const result = await readResponse(mockSession([{ kind: 'stop' }]))

    expect(result).toBe('')
  })

  it('collects text chunks until the session stops', async () => {
    const result = await readResponse(
      mockSession([
        {
          kind: 'session_update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'Hello ' },
          },
        },
        {
          kind: 'session_update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'world' },
          },
        },
        { kind: 'stop' },
      ]),
    )

    expect(result).toBe('Hello world')
  })

  it('ignores updates that are not text chunks', async () => {
    const result = await readResponse(
      mockSession([
        {
          kind: 'session_update',
          update: { sessionUpdate: 'tool_call', content: { type: 'tool_call' } },
        },
        {
          kind: 'session_update',
          update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'done' } },
        },
        { kind: 'stop' },
      ]),
    )

    expect(result).toBe('done')
  })
})

describe('writableStream', () => {
  it('writes chunks to the underlying stream and closes it', async () => {
    const chunks: string[] = []
    const nodeStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk))
        callback()
      },
    })
    const webStream = writableStream(nodeStream)
    const writer = webStream.getWriter()

    await writer.write(new TextEncoder().encode('hello'))
    await writer.close()

    expect(chunks).toStrictEqual(['hello'])
    expect(nodeStream.writableEnded).toBe(true)
  })
})

describe('readableStream', () => {
  it('reads data from the underlying stream until it ends', async () => {
    const nodeStream = Readable.from(['hello', ' ', 'world'])
    const webStream = readableStream(nodeStream)
    const reader = webStream.getReader()
    const chunks: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }

    expect(chunks.join('')).toBe('hello world')
  })

  it('passes binary chunks through without re-encoding', async () => {
    const nodeStream = new Readable()
    nodeStream.push(new TextEncoder().encode('binary'))
    nodeStream.push(null)
    const webStream = readableStream(nodeStream)
    const reader = webStream.getReader()
    const chunks: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }

    expect(chunks).toStrictEqual(['binary'])
  })

  it('propagates errors from the underlying stream', async () => {
    const nodeStream = new Readable({
      read() {
        this.destroy(new StreamFailureTestError('stream failed'))
      },
    })
    const webStream = readableStream(nodeStream)
    const reader = webStream.getReader()

    await expect(reader.read()).rejects.toThrow('stream failed')
  })
})

describe('readStdin', () => {
  it('reads all chunks from the input stream', async () => {
    const stdin = Readable.from(['{"reviewer":', '"code-review"}'])

    const result = await readStdin(stdin)

    expect(result).toBe('{"reviewer":"code-review"}')
  })
})

describe('runAcpSession', () => {
  const initializeRequest = vi.fn(async () => ({}))
  const promptMock = vi.fn(async () => ({}))
  const nextUpdateMock = vi.fn(async () => ({ kind: 'stop' }))
  const buildSessionMock = vi.fn(() => ({
    withSession: vi.fn(async (op: (session: unknown) => Promise<void>) => {
      await op({ prompt: promptMock, nextUpdate: nextUpdateMock })
    }),
  }))
  const connectWithMock = vi.fn(
    async (_stream: unknown, callback: (context: unknown) => Promise<void>) => {
      await callback({
        request: initializeRequest,
        buildSession: buildSessionMock,
      })
    },
  )
  const child = {
    stdin: { write: vi.fn(), end: vi.fn() },
    stdout: { on: vi.fn() },
  }

  function setupClientMock(): { handlers: Record<string, (params: unknown) => unknown> } {
    const handlers: Record<string, (params: unknown) => unknown> = {}
    const clientObj = {
      onRequest: vi.fn((method: string, handler: (params: unknown) => unknown) => {
        handlers[method] = handler
        return clientObj
      }),
      connectWith: connectWithMock,
    }
    mockClient.mockReturnValue(clientObj)
    return { handlers }
  }

  beforeEach(() => {
    mockSpawn.mockReset()
    mockClient.mockReset()
    mockNdJsonStream.mockReset()
    initializeRequest.mockClear()
    promptMock.mockClear()
    nextUpdateMock.mockClear()
    buildSessionMock.mockClear()
    connectWithMock.mockClear()
  })

  it('spawns the ACP agent with the given command and args', async () => {
    setupClientMock()
    mockSpawn.mockReturnValue(child)
    const onSpawned = vi.fn()

    await runAcpSession(
      { prompt: 'Review pull request #42.' },
      { command: 'acp-agent', args: ['--serve'], cwd: '/repo', onSpawned },
    )

    expect(onSpawned).toHaveBeenCalledWith(child)
    expect(mockSpawn).toHaveBeenCalledWith('acp-agent', ['--serve'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })
  })

  it('creates a client that cancels permissions and no-ops file operations', async () => {
    const { handlers } = setupClientMock()
    mockSpawn.mockReturnValue(child)

    await runAcpSession(
      { prompt: 'Review pull request #42.' },
      { command: 'acp-agent', args: [], cwd: '/repo' },
    )

    expect(mockClient).toHaveBeenCalledWith({ name: 'dev-workflow-v2-acp-client' })
    expect(handlers['client/session/requestPermission']?.({})).toStrictEqual({
      outcome: { outcome: 'cancelled' },
    })
    expect(handlers['client/fs/readTextFile']?.({})).toStrictEqual({ content: '' })
    expect(handlers['client/fs/writeTextFile']?.({})).toStrictEqual({})
  })

  it('initialises the agent and prompts it with the review prompt', async () => {
    setupClientMock()
    mockSpawn.mockReturnValue(child)

    await runAcpSession(
      { prompt: 'Review pull request #42.' },
      { command: 'acp-agent', args: [], cwd: '/repo' },
    )

    expect(initializeRequest).toHaveBeenCalledWith('agent/initialize', {
      protocolVersion: '1.0',
      clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
    })
    expect(buildSessionMock).toHaveBeenCalledWith('/repo')
    expect(promptMock).toHaveBeenCalledWith('Review pull request #42.')
  })

  it('connects over the child streams and reads the response', async () => {
    setupClientMock()
    mockSpawn.mockReturnValue(child)

    await runAcpSession(
      { prompt: 'Review pull request #42.' },
      { command: 'acp-agent', args: [], cwd: '/repo' },
    )

    expect(mockNdJsonStream).toHaveBeenCalledWith(
      expect.any(WritableStream),
      expect.any(ReadableStream),
    )
    expect(nextUpdateMock).toHaveBeenCalledWith()
  })
})
