import { z } from 'zod'

const assigneeSchema = z.object({ login: z.string() })

const labelSchema = z.object({ name: z.string() })

const milestoneSchema = z.object({ title: z.string() })

export const taskSchema = z.object({
  number: z.number(),
  title: z.string(),
  assignees: z.array(assigneeSchema),
  body: z.string().nullable(),
  milestone: milestoneSchema.nullable(),
  labels: z.array(labelSchema),
})
export type Task = z.infer<typeof taskSchema>

export const taskListOutputSchema = z.object({
  milestone_tasks: z.array(taskSchema),
  non_milestone_tasks: z.array(taskSchema),
})
export type TaskListOutput = z.infer<typeof taskListOutputSchema>
