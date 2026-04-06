import {
  describe, it, expect, vi 
} from 'vitest'

const mockExecuteListTasks = vi.fn()

vi.mock('../commands/list-tasks', () => ({ executeListTasks: mockExecuteListTasks }))

describe('list-tasks CLI entrypoint', () => {
  it('calls executeListTasks on import', async () => {
    mockExecuteListTasks.mockResolvedValue(undefined)

    await import('./cli')

    expect(mockExecuteListTasks).toHaveBeenCalledWith()
  })
})
