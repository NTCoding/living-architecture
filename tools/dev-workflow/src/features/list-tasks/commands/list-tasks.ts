import { resolve } from 'node:path'
import { github } from '../../../platform/infra/external-clients/github/rest-client'
import { cli } from '../../../platform/infra/external-clients/cli/args'
import { findActivePrdMilestones } from '../../../platform/domain/prd-milestones/active-prd-milestones'
import { createFetchMilestoneTasksStep } from '../domain/steps/fetch-milestone-tasks'
import {
  createFetchNonMilestoneTasksStep,
  type NonMilestoneMode,
} from '../domain/steps/fetch-non-milestone-tasks'
import {
  taskListOutputSchema, type Task, type TaskListOutput 
} from '../domain/task-list-output'
import { InvalidTaskListOutputError } from '../domain/invalid-task-list-output-error'

class ConflictingFlagsError extends Error {
  constructor(flags: string[]) {
    const formatted = flags.map((f) => '--' + f).join(', ')
    super('Only one flag allowed. Got: ' + formatted)
    this.name = 'ConflictingFlagsError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/** @riviere-role command-orchestrator */
export function validateAndLog(output: unknown): void {
  const result = taskListOutputSchema.safeParse(output)
  if (!result.success) {
    throw new InvalidTaskListOutputError(result.error.message)
  }
  console.log(JSON.stringify(result.data, null, 2))
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

/** @riviere-role command-orchestrator */
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
    validateAndLog(output)
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
  validateAndLog(output)
}
