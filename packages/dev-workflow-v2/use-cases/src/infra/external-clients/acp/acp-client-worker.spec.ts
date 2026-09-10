import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { stopAcpProcesses } from './acp-processes'
import type { AcpSessionRequest } from './acp-client'
import type { AcpSessionOptions } from './acp-session'

const { mockReadStdin, mockRunAcpSession } = vi.hoisted(() => ({
  mockReadStdin: vi.fn(),
  mockRunAcpSession: vi.fn(async (_request: AcpSessionRequest, options: AcpSessionOptions) => {
    options.onSpawned?.(spawn(process.execPath, ['-e', '']))
  }),
}))

vi.mock('./acp-session', () => ({
  readStdin: mockReadStdin,
  runAcpSession: mockRunAcpSession,
}))

const VALID_INPUT = {
  command: 'acp-agent',
  args: [],
  sessions: [{ prompt: 'Review pull request #42.' }],
}

describe('acp-client-worker', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadStdin.mockReset()
    mockReadStdin.mockResolvedValue(JSON.stringify(VALID_INPUT))
    mockRunAcpSession.mockClear()
  })

  it('terminates ACP processes before exiting when the worker receives SIGTERM', async () => {
    const { registerAcpTerminationHandler } = await import('./acp-client-worker')
    const listeners: (() => void)[] = []
    const register = (registeredListener: () => void): void => {
      listeners.push(registeredListener)
    }
    class WorkerExitTestError extends Error {}

    registerAcpTerminationHandler(new Set(), register, () => {
      throw new WorkerExitTestError()
    })

    expect(() => listeners[0]?.()).toThrow(WorkerExitTestError)
  })

  it('stops each ACP process when the review worker receives termination', async () => {
    const acpProcess = spawn(process.execPath, [
      '-e',
      'setInterval((processes) => void processes, 1000)',
    ])

    stopAcpProcesses(new Set([acpProcess]))
    await once(acpProcess, 'exit')

    expect(acpProcess.signalCode).toBe('SIGTERM')
  })

  it('runs an ACP session for each supplied prompt', async () => {
    const { runAcpClientWorker } = await import('./acp-client-worker')
    mockRunAcpSession.mockClear()

    await runAcpClientWorker(
      {
        command: 'acp-agent',
        args: ['--serve'],
        sessions: [{ prompt: 'First review.' }, { prompt: 'Second review.' }],
      },
      '/repo',
      (processes) => void processes,
    )

    expect(mockRunAcpSession).toHaveBeenNthCalledWith(
      1,
      { prompt: 'First review.' },
      expect.objectContaining({ command: 'acp-agent', args: ['--serve'], cwd: '/repo' }),
    )
    expect(mockRunAcpSession).toHaveBeenNthCalledWith(
      2,
      { prompt: 'Second review.' },
      expect.objectContaining({ command: 'acp-agent', args: ['--serve'], cwd: '/repo' }),
    )
  })

  it('rejects malformed client input', async () => {
    const { runAcpClientWorker } = await import('./acp-client-worker')
    mockRunAcpSession.mockClear()

    await expect(
      runAcpClientWorker(
        { command: 123, args: [], sessions: [] },
        '/repo',
        (processes) => void processes,
      ),
    ).rejects.toThrow('Expected string, received number')
    expect(mockRunAcpSession).not.toHaveBeenCalled()
  })
})
