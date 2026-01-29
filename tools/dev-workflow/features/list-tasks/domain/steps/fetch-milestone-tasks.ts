import type { Task } from '../task-list-output'

export interface FetchMilestoneTasksDeps {
  listIssuesByMilestone: (milestone: string) => Promise<Task[]>
  findActivePrdMilestones: () => string[]
}

export function createFetchMilestoneTasksStep(deps: FetchMilestoneTasksDeps) {
  return {
    async execute(): Promise<Task[]> {
      const milestones = deps.findActivePrdMilestones()
      const taskArrays = await Promise.all(milestones.map((m) => deps.listIssuesByMilestone(m)))
      return taskArrays.flat()
    },
  }
}
