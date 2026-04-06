import { z } from 'zod'

export const preToolUseOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PreToolUse'),
    permissionDecision: z.enum(['allow', 'deny', 'ask']),
    permissionDecisionReason: z.string(),
  }),
})
/** @riviere-role value-object */
export type PreToolUseOutput = z.infer<typeof preToolUseOutputSchema>

export const postToolUseOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PostToolUse'),
    additionalContext: z.string().optional(),
  }),
})
/** @riviere-role value-object */
export type PostToolUseOutput = z.infer<typeof postToolUseOutputSchema>

export const stopOutputSchema = z.discriminatedUnion('_tag', [
  z.object({ _tag: z.literal('allow') }),
  z.object({
    _tag: z.literal('block'),
    reason: z.string(),
  }),
])
/** @riviere-role value-object */
export type StopOutput = z.infer<typeof stopOutputSchema>

/** @riviere-role value-object */
export type HookOutput = PreToolUseOutput | PostToolUseOutput | StopOutput
