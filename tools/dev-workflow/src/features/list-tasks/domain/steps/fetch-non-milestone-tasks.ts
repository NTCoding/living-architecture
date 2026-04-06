import type { Task } from '../task-list-output'

/** @riviere-role value-object */
export type NonMilestoneMode = 'ideas' | 'bugs' | 'tech' | 'all'

/** @riviere-role value-object */
export interface FetchNonMilestoneTasksDeps {listIssuesByLabel: (label: string) => Promise<Task[]>}

const MODE_TO_LABELS: Record<NonMilestoneMode, string[]> = {
  ideas: ['idea'],
  bugs: ['bug'],
  tech: ['tech improvement'],
  all: ['idea', 'bug', 'tech improvement'],
}

/** @riviere-role domain-service */
export function createFetchNonMilestoneTasksStep(deps: FetchNonMilestoneTasksDeps) {
  return {
    async execute(mode: NonMilestoneMode): Promise<Task[]> {
      const labels = MODE_TO_LABELS[mode]
      const taskArrays = await Promise.all(labels.map((label) => deps.listIssuesByLabel(label)))
      const allTasks = taskArrays.flat()
      const uniqueByNumber = new Map(allTasks.map((task) => [task.number, task]))
      return [...uniqueByNumber.values()]
    },
  }
}
