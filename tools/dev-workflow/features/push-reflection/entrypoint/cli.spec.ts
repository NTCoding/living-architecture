import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const mockExecute = vi.hoisted(() => vi.fn())

vi.mock('../commands/push-reflection', () => ({ executePushReflection: mockExecute }))

describe('push-reflection CLI entrypoint', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls executePushReflection', async () => {
    mockExecute.mockResolvedValue(undefined)

    await import('./cli')
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledOnce()
    })
  })
})
