import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import { AcpClient, AcpClientTimeoutError, type AcpClientOptions } from './acp-client'

class SpawnFailureTestError extends Error {}
class SpawnTimeoutTestError extends Error {
  readonly code = 'ETIMEDOUT'
}

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

const mockSpawnSync = vi.mocked(spawnSync)
const OPTIONS: AcpClientOptions = {
  workerPath: '/path/to/worker.js',
  provider: 'pi',
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
        input: JSON.stringify({ sessions: SESSIONS, command: 'npx', args: ['-y', 'pi-acp'] }),
        timeout: 7 * 60 * 1000,
        killSignal: 'SIGTERM',
      }),
    )
  })

  it.each([
    ['claude', 'npx', ['-y', '@agentclientprotocol/claude-agent-acp']],
    ['codex', 'npx', ['-y', '@agentclientprotocol/codex-acp']],
    ['opencode', 'opencode', ['acp']],
    ['pi', 'npx', ['-y', 'pi-acp']],
  ] as const)('maps the %s provider to its ACP adapter', (provider, command, args) => {
    mockSpawnSync.mockReturnValue(spawnResult())

    new AcpClient({ workerPath: OPTIONS.workerPath, provider, cwd: OPTIONS.cwd }).run(SESSIONS)

    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      [OPTIONS.workerPath],
      expect.objectContaining({ input: JSON.stringify({ sessions: SESSIONS, command, args }) }),
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
