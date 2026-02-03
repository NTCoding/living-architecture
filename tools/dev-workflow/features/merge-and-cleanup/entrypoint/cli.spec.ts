import {
  describe, it, expect, vi 
} from 'vitest'

vi.mock('../commands/merge-and-cleanup', () => ({ executeMergeAndCleanup: vi.fn() }))

describe('merge-and-cleanup CLI entrypoint', () => {
  it('calls executeMergeAndCleanup when imported', async () => {
    const { executeMergeAndCleanup } = await import('../commands/merge-and-cleanup')

    await import('./cli')

    expect(executeMergeAndCleanup).toHaveBeenCalledWith()
  })
})
