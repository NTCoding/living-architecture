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

export const stopOutputSchema = z.object({
  decision: z.enum(['block', 'continue']).optional(),
  reason: z.string().optional(),
})
export type StopOutput = z.infer<typeof stopOutputSchema>
