import { z } from 'zod'
import { baseContextSchema } from '../../../platform/domain/workflow-execution/workflow-runner'

/* v8 ignore start -- schema used for type inference only */
export const mergeCleanupContextSchema = baseContextSchema.extend({
  reflectionFilePath: z.string(),
  prNumber: z.number(),
  worktreePath: z.string(),
  mainRepoPath: z.string(),
})
/* v8 ignore stop */

export type MergeCleanupContext = z.infer<typeof mergeCleanupContextSchema>
