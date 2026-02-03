import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const mockExecute = vi.hoisted(() => vi.fn())

vi.mock('../commands/push-reflection', () => ({ executePushReflection: mockExecute }))

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

  it('outputs success JSON when push succeeds', async () => {
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
    const error = new TypeError('push failed')
    mockExecute.mockRejectedValue(error)

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
})
