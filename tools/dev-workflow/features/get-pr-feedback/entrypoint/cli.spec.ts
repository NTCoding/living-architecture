import {
  describe, it, expect, vi 
} from 'vitest'

vi.mock('../use-cases/get-pr-feedback', () => ({ executeGetPRFeedback: vi.fn() }))

describe('get-pr-feedback CLI entrypoint', () => {
  it('calls executeGetPRFeedback when imported', async () => {
    const { executeGetPRFeedback } = await import('../use-cases/get-pr-feedback')

    await import('./cli')

    expect(executeGetPRFeedback).toHaveBeenCalledWith()
  })
})
