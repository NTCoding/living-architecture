import {
  describe, it, expect, vi 
} from 'vitest'

vi.mock('../use-cases/respond-to-feedback', () => ({executeRespondToFeedback: vi.fn().mockResolvedValue(undefined),}))

describe('respond-to-feedback CLI entrypoint', () => {
  it('calls executeRespondToFeedback when imported', async () => {
    const { executeRespondToFeedback } = await import('../use-cases/respond-to-feedback')

    await import('./cli')

    expect(executeRespondToFeedback).toHaveBeenCalledWith()
  })
})
