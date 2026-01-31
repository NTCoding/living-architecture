import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import {
  taskListOutputSchema, type TaskListOutput, type Task 
} from '../domain/task-list-output'

const {
  mockGithub, mockCli 
} = vi.hoisted(() => ({
  mockGithub: {
    getMilestoneNumber: vi.fn(),
    listIssuesByMilestone: vi.fn(),
    listIssuesByLabel: vi.fn(),
  },
  mockCli: { hasFlag: vi.fn() },
}))

vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGithub,}))

vi.mock('../../../platform/infra/external-clients/cli-args', () => ({ cli: mockCli }))

vi.mock('../../../platform/domain/prd-milestones/active-prd-milestones', () => ({findActivePrdMilestones: () => ['phase-11-metadata-extraction'],}))

import {
  executeListTasks, validateAndLog, InvalidTaskListOutputError 
} from './list-tasks'

function parseOutput(calls: unknown[][]): TaskListOutput {
  const raw: unknown = JSON.parse(String(calls[0][0]))
  return taskListOutputSchema.parse(raw)
}

const milestoneTask: Task = {
  number: 166,
  title: 'Add CLI flags',
  assignees: [{ login: 'NTCoding' }],
  body: 'milestone body',
  milestone: { title: 'phase-11-metadata-extraction' },
  labels: [{ name: 'prd:phase-11' }],
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

describe('validateAndLog', () => {
  it('throws InvalidTaskListOutputError when output fails validation', () => {
    const invalidOutput: unknown = { milestone_tasks: 'not-an-array' }

    expect(() => validateAndLog(invalidOutput)).toThrow(InvalidTaskListOutputError)
  })
})

describe('executeListTasks', () => {
  const spies = { console: vi.spyOn(console, 'log') }

  beforeEach(() => {
    vi.clearAllMocks()
    spies.console = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mockCli.hasFlag.mockReturnValue(false)
  })

  afterEach(() => {
    spies.console.mockRestore()
  })

  it('outputs milestone and non-milestone tasks as JSON when no flags', async () => {
    mockGithub.getMilestoneNumber.mockResolvedValue(3)
    mockGithub.listIssuesByMilestone.mockResolvedValue([milestoneTask])
    mockGithub.listIssuesByLabel
      .mockResolvedValueOnce([ideaTask])
      .mockResolvedValueOnce([bugTask])
      .mockResolvedValueOnce([techTask])

    await executeListTasks()

    const output = parseOutput(spies.console.mock.calls)
    expect(output.milestone_tasks).toStrictEqual([milestoneTask])
    expect(output.non_milestone_tasks).toStrictEqual([ideaTask, bugTask, techTask])
  })

  it('outputs only non-milestone tasks when --ideas flag is set', async () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--ideas')
    mockGithub.listIssuesByLabel.mockResolvedValue([ideaTask])

    await executeListTasks()

    const output = parseOutput(spies.console.mock.calls)
    expect(output.milestone_tasks).toStrictEqual([])
    expect(output.non_milestone_tasks).toStrictEqual([ideaTask])
    expect(mockGithub.getMilestoneNumber).not.toHaveBeenCalled()
  })

  it('outputs only bug tasks when --bugs flag is set', async () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--bugs')
    mockGithub.listIssuesByLabel.mockResolvedValue([bugTask])

    await executeListTasks()

    const output = parseOutput(spies.console.mock.calls)
    expect(output.non_milestone_tasks).toStrictEqual([bugTask])
  })

  it('outputs only tech tasks when --tech flag is set', async () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--tech')
    mockGithub.listIssuesByLabel.mockResolvedValue([techTask])

    await executeListTasks()

    const output = parseOutput(spies.console.mock.calls)
    expect(output.non_milestone_tasks).toStrictEqual([techTask])
  })

  it('throws when multiple flags are set', async () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--ideas' || flag === '--bugs')

    await expect(executeListTasks()).rejects.toThrow('Only one flag allowed')
  })

  it('returns empty milestone tasks when milestone not found on GitHub', async () => {
    mockGithub.getMilestoneNumber.mockResolvedValue(undefined)
    mockGithub.listIssuesByLabel.mockResolvedValue([])

    await executeListTasks()

    const output = parseOutput(spies.console.mock.calls)
    expect(output.milestone_tasks).toStrictEqual([])
  })
})
