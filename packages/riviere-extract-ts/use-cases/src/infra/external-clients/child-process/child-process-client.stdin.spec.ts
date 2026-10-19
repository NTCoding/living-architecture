import { ChildProcess, spawn } from 'node:child_process'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChildProcessClient } from './child-process-client'

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, spawn: vi.fn() }
})

class StdinWriteTestError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'StdinWriteTestError'
    this.code = code
  }
}

function stdinWriteInput() {
  return {
    kind: 'pipe-stdin' as const,
    command: 'claude',
    args: ['-p'],
    stdin: 'prompt text',
    timeoutMilliseconds: 10_000,
    maximumOutputBytes: 1024,
  }
}

function fakeChildProcess(): ChildProcess {
  const child = new ChildProcess()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  vi.spyOn(child, 'kill').mockReturnValue(true)
  return child
}

afterEach(() => vi.restoreAllMocks())

describe('ChildProcessClient stdin write errors', () => {
  it('returns a stdin failure when stdin reports a non-benign write error', async () => {
    const child = fakeChildProcess()
    vi.mocked(spawn).mockReturnValue(child)
    const client = new ChildProcessClient()

    const result = client.run(stdinWriteInput())
    child.stdin?.emit('error', new StdinWriteTestError('write EACCES', 'EACCES'))
    child.emit('close', 0, null)

    await expect(result).resolves.toStrictEqual({
      kind: 'stdin-failed',
      reason: 'StdinWriteTestError: write EACCES',
    })
  })

  it('ignores a benign EPIPE stdin write error', async () => {
    const child = fakeChildProcess()
    vi.mocked(spawn).mockReturnValue(child)
    const client = new ChildProcessClient()

    const result = client.run(stdinWriteInput())
    child.stdin?.emit('error', new StdinWriteTestError('write EPIPE', 'EPIPE'))
    child.emit('close', 0, null)

    await expect(result).resolves.toMatchObject({ kind: 'completed', exitCode: 0 })
  })
})
