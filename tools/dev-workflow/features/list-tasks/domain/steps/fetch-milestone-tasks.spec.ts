import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { createFetchMilestoneTasksStep } from './fetch-milestone-tasks'
import type { Task } from '../task-list-output'

const mockListIssuesByMilestone = vi.fn<(milestone: string) => Promise<Task[]>>()
const mockFindActivePrdMilestones = vi.fn<() => string[]>()

function createStep() {
  return createFetchMilestoneTasksStep({
    listIssuesByMilestone: mockListIssuesByMilestone,
    findActivePrdMilestones: mockFindActivePrdMilestones,
  })
}

const sampleTask: Task = {
  number: 166,
  title: '[M2-D2.6] Add CLI flags',
  assignees: [{ login: 'NTCoding' }],
  body: 'PRD Section: M2-D2.6',
  milestone: { title: 'phase-11-metadata-extraction' },
  labels: [{ name: 'prd:phase-11' }],
}

describe('fetchMilestoneTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tasks from active PRD milestone', async () => {
    mockFindActivePrdMilestones.mockReturnValue(['phase-11-metadata-extraction'])
    mockListIssuesByMilestone.mockResolvedValue([sampleTask])

    const step = createStep()
    const result = await step.execute()

    expect(result).toStrictEqual([sampleTask])
  })

  it('returns empty array when no active PRD milestones', async () => {
    mockFindActivePrdMilestones.mockReturnValue([])

    const step = createStep()
    const result = await step.execute()

    expect(result).toStrictEqual([])
  })

  it('returns tasks from multiple active PRD milestones', async () => {
    const taskFromSecondMilestone: Task = {
      ...sampleTask,
      number: 200,
      title: 'Task from second milestone',
      milestone: { title: 'phase-12' },
    }
    mockFindActivePrdMilestones.mockReturnValue(['phase-11-metadata-extraction', 'phase-12'])
    mockListIssuesByMilestone
      .mockResolvedValueOnce([sampleTask])
      .mockResolvedValueOnce([taskFromSecondMilestone])

    const step = createStep()
    const result = await step.execute()

    expect(result).toStrictEqual([sampleTask, taskFromSecondMilestone])
  })

  it('passes milestone names through to listIssuesByMilestone', async () => {
    mockFindActivePrdMilestones.mockReturnValue(['phase-11-metadata-extraction'])
    mockListIssuesByMilestone.mockResolvedValue([])

    const step = createStep()
    await step.execute()

    expect(mockListIssuesByMilestone).toHaveBeenCalledWith('phase-11-metadata-extraction')
  })
})
