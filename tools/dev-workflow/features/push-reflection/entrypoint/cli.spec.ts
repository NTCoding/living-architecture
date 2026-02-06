import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const mockExecute = vi.hoisted(() => vi.fn())
const mockCli = vi.hoisted(() => ({ hasFlag: vi.fn() }))

vi.mock('../commands/push-reflection', () => ({ executePushReflection: mockExecute }))
vi.mock('../../../platform/infra/external-clients/cli-args', () => ({ cli: mockCli }))

function noop(): void {
  /* intentionally empty */
}

describe('push-reflection CLI entrypoint', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    vi.spyOn(console, 'log').mockImplementation(noop)
    process.exitCode = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('outputs success JSON when push succeeds', async () => {
    mockCli.hasFlag.mockReturnValue(false)
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
    mockCli.hasFlag.mockReturnValue(false)
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
    mockCli.hasFlag.mockReturnValue(false)
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
    mockCli.hasFlag.mockReturnValue(true)
    mockExecute.mockResolvedValue({ pushedFiles: ['anti-patterns.md'] })

    await import('./cli')
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ followUps: true })
    })

    expect(mockCli.hasFlag).toHaveBeenCalledWith('--follow-ups')
  })

  it('passes followUps false when flag not present', async () => {
    mockCli.hasFlag.mockReturnValue(false)
    mockExecute.mockResolvedValue({ pushedFiles: ['reflection.md'] })

    await import('./cli')
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ followUps: false })
    })
  })
})
