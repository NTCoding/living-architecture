import { resolve } from 'node:path'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { findActivePrdMilestones } from '../../../platform/domain/prd-milestones/active-prd-milestones'
import { createFetchMilestoneTasksStep } from '../domain/steps/fetch-milestone-tasks'
import {
  createFetchNonMilestoneTasksStep,
  type NonMilestoneMode,
} from '../domain/steps/fetch-non-milestone-tasks'
import type {
  Task, TaskListOutput 
} from '../domain/task-list-output'

class ConflictingFlagsError extends Error {
  constructor(flags: string[]) {
    const formatted = flags.map((f) => '--' + f).join(', ')
    super('Only one flag allowed. Got: ' + formatted)
    this.name = 'ConflictingFlagsError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

const NON_MILESTONE_FLAGS: NonMilestoneMode[] = ['ideas', 'bugs', 'tech']

function parseMode(): NonMilestoneMode | 'all-tasks' {
  const activeFlags = NON_MILESTONE_FLAGS.filter((flag) => cli.hasFlag(`--${flag}`))

  if (activeFlags.length > 1) {
    throw new ConflictingFlagsError(activeFlags)
  }

  if (activeFlags.length === 1) {
    return activeFlags[0]
  }

  return 'all-tasks'
}

async function listIssuesByMilestoneName(milestoneName: string): Promise<Task[]> {
  const milestoneNumber = await github.getMilestoneNumber(milestoneName)
  if (milestoneNumber === undefined) {
    return []
  }
  return github.listIssuesByMilestone(milestoneNumber)
}

export async function executeListTasks(): Promise<void> {
  const mode = parseMode()
  const prdActiveDir = resolve(process.cwd(), 'docs/project/PRD/active')

  const fetchNonMilestone = createFetchNonMilestoneTasksStep({listIssuesByLabel: github.listIssuesByLabel.bind(github),})

  if (mode !== 'all-tasks') {
    const nonMilestoneTasks = await fetchNonMilestone.execute(mode)
    const output: TaskListOutput = {
      milestone_tasks: [],
      non_milestone_tasks: nonMilestoneTasks,
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  const fetchMilestone = createFetchMilestoneTasksStep({
    listIssuesByMilestone: listIssuesByMilestoneName,
    findActivePrdMilestones: () => findActivePrdMilestones(prdActiveDir),
  })

  const [milestoneTasks, nonMilestoneTasks] = await Promise.all([
    fetchMilestone.execute(),
    fetchNonMilestone.execute('all'),
  ])

  const output: TaskListOutput = {
    milestone_tasks: milestoneTasks,
    non_milestone_tasks: nonMilestoneTasks,
  }
  console.log(JSON.stringify(output, null, 2))
}
