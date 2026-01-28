import { z } from 'zod'

export const preToolUseOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PreToolUse'),
    permissionDecision: z.enum(['allow', 'deny', 'ask']),
    permissionDecisionReason: z.string(),
  }),
})
export type PreToolUseOutput = z.infer<typeof preToolUseOutputSchema>

export const postToolUseOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PostToolUse'),
    additionalContext: z.string().optional(),
  }),
})
export type PostToolUseOutput = z.infer<typeof postToolUseOutputSchema>

const outputToUserSchema = z.object({ passthrough: z.literal(false) })

export const stopOutputSchema = z.object({
  outputToUser: outputToUserSchema.optional(),
  continue: z.boolean().optional(),
  stopReason: z.string().optional(),
})
export type StopOutput = z.infer<typeof stopOutputSchema>

export type HookOutput = PreToolUseOutput | PostToolUseOutput | StopOutput
