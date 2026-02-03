import { z } from 'zod'
import { baseContextSchema } from '../../../platform/domain/workflow-execution/workflow-runner'

export const mergeCleanupContextSchema = baseContextSchema.extend({
  reflectionFilePath: z.string(),
  prNumber: z.number(),
  worktreePath: z.string(),
  mainRepoPath: z.string(),
})

export type MergeCleanupContext = z.infer<typeof mergeCleanupContextSchema>
