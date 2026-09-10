import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import { AcpClient, AcpClientTimeoutError } from './acp-client'

class SpawnFailureTestError extends Error {}
class SpawnTimeoutTestError extends Error {
  readonly code = 'ETIMEDOUT'
}

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

const mockSpawnSync = vi.mocked(spawnSync)
const OPTIONS = {
  workerPath: '/path/to/worker.js',
  command: 'acp-agent',
  args: ['--serve'],
  cwd: '/repo',
}
const SESSIONS = [{ prompt: 'Review pull request #42.' }]

function spawnResult(overrides: Partial<SpawnSyncReturns<string>> = {}): SpawnSyncReturns<string> {
  return {
    pid: 123,
    output: ['', '', ''],
    stdout: '',
    stderr: '',
    status: 0,
    signal: null,
    ...overrides,
  }
}

describe('AcpClient', () => {
  beforeEach(() => mockSpawnSync.mockReset())

  it('runs the worker with ACP session requests', () => {
    mockSpawnSync.mockReturnValue(spawnResult())

    new AcpClient(OPTIONS).run(SESSIONS)

    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      ['/path/to/worker.js'],
      expect.objectContaining({
        cwd: '/repo',
        input: JSON.stringify({ sessions: SESSIONS, command: 'acp-agent', args: ['--serve'] }),
        timeout: 7 * 60 * 1000,
        killSignal: 'SIGTERM',
      }),
    )
  })

  it('uses an empty argument list when ACP arguments are absent', () => {
    mockSpawnSync.mockReturnValue(spawnResult())

    new AcpClient({
      workerPath: OPTIONS.workerPath,
      command: OPTIONS.command,
      cwd: OPTIONS.cwd,
    }).run(SESSIONS)

    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      ['/path/to/worker.js'],
      expect.objectContaining({
        input: JSON.stringify({ sessions: SESSIONS, command: 'acp-agent', args: [] }),
      }),
    )
  })

  it('throws the process error when the worker cannot start', () => {
    mockSpawnSync.mockReturnValue(
      spawnResult({ status: null, error: new SpawnFailureTestError('spawn failed') }),
    )

    expect(() => new AcpClient(OPTIONS).run(SESSIONS)).toThrow('spawn failed')
  })

  it('throws a timeout error when the review batch exceeds seven minutes', () => {
    mockSpawnSync.mockReturnValue(
      spawnResult({ status: null, error: new SpawnTimeoutTestError('timed out') }),
    )

    expect(() => new AcpClient(OPTIONS).run(SESSIONS)).toThrow(AcpClientTimeoutError)
  })

  it('throws worker error output when the worker fails', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ status: 1, stderr: 'worker error output' }))

    expect(() => new AcpClient(OPTIONS).run(SESSIONS)).toThrow(
      'ACP client exited with status 1: worker error output',
    )
  })
})
