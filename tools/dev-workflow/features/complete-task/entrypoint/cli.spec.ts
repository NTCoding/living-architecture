import {
  describe, it, expect, vi 
} from 'vitest'

vi.mock('../commands/complete-task', () => ({ executeCompleteTask: vi.fn() }))

describe('complete-task CLI entrypoint', () => {
  it('calls executeCompleteTask when imported', async () => {
    const { executeCompleteTask } = await import('../commands/complete-task')

    await import('./cli')

    expect(executeCompleteTask).toHaveBeenCalledWith()
  })
})
