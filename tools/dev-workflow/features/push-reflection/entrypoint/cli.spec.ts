import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const mockExecute = vi.hoisted(() => vi.fn())

vi.mock('../commands/push-reflection', () => ({ executePushReflection: mockExecute }))

function noop(): void {
  /* intentionally empty */
}

describe('push-reflection CLI entrypoint', () => {
  const savedArgv = process.argv

  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    vi.spyOn(console, 'log').mockImplementation(noop)
    process.exitCode = undefined
  })

  afterEach(() => {
    process.argv = savedArgv
    vi.restoreAllMocks()
  })

  it('outputs success JSON when push succeeds', async () => {
    process.argv = ['node', 'cli.ts']
    mockExecute.mockResolvedValue({ pushedFiles: ['a.md'] })

    await import('./cli')
    await vi.waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          pushedFiles: ['a.md'],
        }),
      )
    })
  })

  it('outputs error JSON and sets exit code on failure', async () => {
    process.argv = ['node', 'cli.ts']
    mockExecute.mockRejectedValue(new TypeError('push failed'))

    await import('./cli')
    await vi.waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'push failed',
        }),
      )
    })

    expect(process.exitCode).toBe(1)
  })

  it('handles non-Error rejection', async () => {
    process.argv = ['node', 'cli.ts']
    mockExecute.mockRejectedValue('string error')

    await import('./cli')
    await vi.waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'string error',
        }),
      )
    })
  })

  it('passes --follow-ups flag to executePushReflection', async () => {
    process.argv = ['node', 'cli.ts', '--follow-ups']
    mockExecute.mockResolvedValue({ pushedFiles: ['anti-patterns.md'] })

    await import('./cli')
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ followUps: true })
    })
  })

  it('passes followUps false when flag not present', async () => {
    process.argv = ['node', 'cli.ts']
    mockExecute.mockResolvedValue({ pushedFiles: ['reflection.md'] })

    await import('./cli')
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ followUps: false })
    })
  })
})
