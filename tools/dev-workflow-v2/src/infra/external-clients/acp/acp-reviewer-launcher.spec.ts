import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import { AcpReviewerLauncher } from './acp-reviewer-launcher'

class SpawnFailureTestError extends Error {}

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}))

const mockSpawnSync = vi.mocked(spawnSync)

const OPTIONS = {
  workerPath: '/path/to/worker.js',
  command: 'acp-reviewer',
  args: ['--flag'],
  cwd: '/repo',
}

const REQUEST = {
  pullRequestNumber: 42,
  reviewer: 'code-review' as const,
  workflowState: { currentStateMachineState: 'REVIEWING' },
}

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

describe('AcpReviewerLauncher', () => {
  beforeEach(() => {
    mockSpawnSync.mockReset()
  })

  it('spawns the worker with the requests and options', () => {
    mockSpawnSync.mockReturnValue(spawnResult())

    const launcher = new AcpReviewerLauncher(OPTIONS)
    launcher.run([REQUEST])

    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      ['/path/to/worker.js'],
      expect.objectContaining({
        cwd: '/repo',
        input: JSON.stringify({
          requests: [REQUEST],
          command: 'acp-reviewer',
          args: ['--flag'],
        }),
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      }),
    )
  })

  it('defaults args to an empty array when not provided', () => {
    mockSpawnSync.mockReturnValue(spawnResult())

    const launcher = new AcpReviewerLauncher({
      workerPath: OPTIONS.workerPath,
      command: OPTIONS.command,
      cwd: OPTIONS.cwd,
    })
    launcher.run([REQUEST])

    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      ['/path/to/worker.js'],
      expect.objectContaining({
        input: JSON.stringify({
          requests: [REQUEST],
          command: 'acp-reviewer',
          args: [],
        }),
      }),
    )
  })

  it('throws when the worker process fails to spawn', () => {
    mockSpawnSync.mockReturnValue(
      spawnResult({ status: null, error: new SpawnFailureTestError('spawn failed') }),
    )

    const launcher = new AcpReviewerLauncher(OPTIONS)
    expect(() => launcher.run([REQUEST])).toThrow('spawn failed')
  })

  it('throws when the worker exits with a non-zero status', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ status: 1, stderr: 'worker error output' }))

    const launcher = new AcpReviewerLauncher(OPTIONS)
    expect(() => launcher.run([REQUEST])).toThrow(
      'ACP reviewer exited with status 1: worker error output',
    )
  })
})
