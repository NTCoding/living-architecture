import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { createFetchNonMilestoneTasksStep } from './fetch-non-milestone-tasks'
import type { Task } from '../task-list-output'

const mockListIssuesByLabel = vi.fn<(label: string) => Promise<Task[]>>()

function createStep() {
  return createFetchNonMilestoneTasksStep({ listIssuesByLabel: mockListIssuesByLabel })
}

const ideaTask: Task = {
  number: 180,
  title: 'An idea',
  assignees: [],
  body: 'idea body',
  milestone: null,
  labels: [{ name: 'idea' }],
}

const bugTask: Task = {
  number: 181,
  title: 'A bug',
  assignees: [],
  body: 'bug body',
  milestone: null,
  labels: [{ name: 'bug' }],
}

const techTask: Task = {
  number: 174,
  title: 'Tech improvement',
  assignees: [],
  body: 'tech body',
  milestone: null,
  labels: [{ name: 'tech improvement' }],
}

describe('fetchNonMilestoneTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tasks with idea label when mode is ideas', async () => {
    mockListIssuesByLabel.mockResolvedValue([ideaTask])

    const step = createStep()
    const result = await step.execute('ideas')

    expect(mockListIssuesByLabel).toHaveBeenCalledWith('idea')
    expect(result).toStrictEqual([ideaTask])
  })

  it('returns tasks with bug label when mode is bugs', async () => {
    mockListIssuesByLabel.mockResolvedValue([bugTask])

    const step = createStep()
    const result = await step.execute('bugs')

    expect(mockListIssuesByLabel).toHaveBeenCalledWith('bug')
    expect(result).toStrictEqual([bugTask])
  })

  it('returns tasks with tech improvement label when mode is tech', async () => {
    mockListIssuesByLabel.mockResolvedValue([techTask])

    const step = createStep()
    const result = await step.execute('tech')

    expect(mockListIssuesByLabel).toHaveBeenCalledWith('tech improvement')
    expect(result).toStrictEqual([techTask])
  })

  it('returns all non-milestone tasks when mode is all', async () => {
    mockListIssuesByLabel
      .mockResolvedValueOnce([ideaTask])
      .mockResolvedValueOnce([bugTask])
      .mockResolvedValueOnce([techTask])

    const step = createStep()
    const result = await step.execute('all')

    expect(mockListIssuesByLabel).toHaveBeenCalledTimes(3)
    expect(result).toStrictEqual([ideaTask, bugTask, techTask])
  })

  it('deduplicates tasks appearing under multiple labels', async () => {
    const dualLabelTask: Task = {
      number: 190,
      title: 'Dual label task',
      assignees: [],
      body: 'dual body',
      milestone: null,
      labels: [{ name: 'idea' }, { name: 'bug' }],
    }
    mockListIssuesByLabel
      .mockResolvedValueOnce([dualLabelTask])
      .mockResolvedValueOnce([dualLabelTask])
      .mockResolvedValueOnce([])

    const step = createStep()
    const result = await step.execute('all')

    expect(result).toStrictEqual([dualLabelTask])
  })

  it('returns empty array when no tasks match label', async () => {
    mockListIssuesByLabel.mockResolvedValue([])

    const step = createStep()
    const result = await step.execute('ideas')

    expect(result).toStrictEqual([])
  })
})
